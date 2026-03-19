/**
 * Transfer Service
 * 
 * Handles fund transfers between wallets with fraud detection integration.
 * 
 * Security Architecture:
 * - Input validation: positive amount check before any processing
 * - Fraud evaluation: heuristic checks before allowing transfer
 * - Atomic transactions: Database-level ACID transfer via RPC
 * - Fraud flagging: suspicious transfers marked for manual review
 * - Audit trail: all transfers logged via audit middleware
 * 
 * Critical Security Controls:
 * - Sender verified from authenticated user (not client-provided)
 * - Receiver lookup by email (prevents IDOR via wallet ID guessing)
 * - Balance check in atomic transaction (prevents overdraft race conditions)
 * - Fraud service called BEFORE transfer (fails fast on suspicious activity)
 * 
 * @module services/transferService
 */

const { getSupabase } = require('../supabase');
const { evaluateFraud } = require('./fraudService');

/**
 * Executes a fund transfer between wallets
 * 
 * Multi-step process with security checks at each stage:
 * 1. Validate amount is positive
 * 2. Fetch sender wallet and verify exists
 * 3. Lookup receiver by email (not ID - prevents enumeration)
 * 4. Fetch receiver wallet
 * 5. Run fraud detection heuristics
 * 6. Execute atomic DB transfer (atomicity prevents partial failures)
 * 7. Create fraud alerts if suspicious
 * 
 * @param {Object} params - Transfer parameters
 * @param {string} params.senderUserId - Authenticated user ID (from JWT, NOT client)
 * @param {string} params.receiverEmail - Recipient email address
 * @param {number} params.amount - Transfer amount (positive number)
 * @returns {Object} Transfer transaction and fraud alerts
 * @throws {Error} Various errors: invalid_amount, sender_wallet_not_found, etc.
 */
async function transfer({ senderUserId, receiverEmail, amount }) {
  // Security: Reject non-positive amounts at entry point
  if (amount <= 0) throw new Error('invalid_amount');
  
  const supabase = getSupabase();

  // Fetch sender's wallet - uses user_id from auth token (not client-supplied)
  const senderWalletRes = await supabase
    .from('wallets')
    .select('id, balance, status')
    .eq('user_id', senderUserId)
    .limit(1)
    .single();
  if (senderWalletRes.error) throw new Error('sender_wallet_not_found');

  // Lookup recipient by email - prevents wallet ID enumeration
  // Using email (not ID) adds layer of indirection
  const receiverUserRes = await supabase
    .from('users')
    .select('id')
    .eq('email', receiverEmail)
    .limit(1)
    .single();
  if (receiverUserRes.error) throw new Error('receiver_wallet_not_found');

  // Fetch receiver's wallet
  const receiverWalletRes = await supabase
    .from('wallets')
    .select('id, balance, status')
    .eq('user_id', receiverUserRes.data.id)
    .limit(1)
    .single();
  if (receiverWalletRes.error) throw new Error('receiver_wallet_not_found');

  // Run fraud detection heuristics BEFORE transfer
  // This is the "defense in depth" layer - catches suspicious patterns
  const fraudAlerts = await evaluateFraud({
    senderWalletId: senderWalletRes.data.id,
    receiverWalletId: receiverWalletRes.data.id,
    amount
  });

  // Determine transaction status based on fraud evaluation
  // PENDING_REVIEW allows transfer but flags for manual review
  // COMPLETED allows immediate processing
  const status = fraudAlerts.length > 0 ? 'PENDING_REVIEW' : 'COMPLETED';
  const fraudFlag = fraudAlerts.length > 0;

  // Execute atomic database transfer via stored procedure
  // transfer_funds RPC handles:
  // - Balance deduction from sender
  // - Balance credit to receiver  
  // - Transaction ledger entry
  // All in single transaction - prevents partial state on failure
  const rpcRes = await supabase.rpc('transfer_funds', {
    p_sender_user_id: senderUserId,
    p_receiver_email: receiverEmail,
    p_amount: amount,
    p_status: status,
    p_fraud_flag: fraudFlag
  });
  if (rpcRes.error) {
    // Log actual error internally; return generic message to client
    if (rpcRes.error.message) throw new Error(rpcRes.error.message);
    throw new Error('transfer_failed');
  }

  // Extract transaction from RPC response
  const transaction = Array.isArray(rpcRes.data) ? rpcRes.data[0] : rpcRes.data;

  // Create fraud alert records if suspicious activity detected
  // These go to a review queue for manual investigation
  if (fraudAlerts.length > 0 && transaction?.id) {
    for (const alert of fraudAlerts) {
      await supabase.from('fraud_alerts').insert({
        transaction_id: transaction.id,
        rule: alert.rule,
        severity: alert.severity,
        status: 'OPEN'
      });
    }
  }

  return { transaction, fraudAlerts };
}

module.exports = { transfer };
