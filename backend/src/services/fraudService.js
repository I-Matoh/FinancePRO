/**
 * Fraud Detection Service
 * 
 * Implements heuristic-based fraud detection for transfers.
 * These are fast, deterministic checks that run synchronously before transfer completion.
 * 
 * Detection Rules:
 * - amount_threshold: Flags large single transfers (configurable threshold)
 * - velocity: Flags rapid successive transfers (possible compromised account)
 * - new_recipient: Flags first-time recipient (possible social engineering)
 * 
 * Security Model:
 * - Heuristics are SLOW CHECKS - fast and deterministic
 * - Returns ALERTS, not decisions - transfers proceed with PENDING_REVIEW status
 * - Human review required for high-severity alerts
 * - False positives preferred over false negatives (better to flag than miss)
 * 
 * Note: This is a basic implementation. Production systems should consider:
 * - Machine learning models for anomaly detection
 * - Device fingerprinting
 * - Geolocation analysis
 * - Behavioral biometrics
 * - External fraud databases
 * 
 * @module services/fraudService
 */

const { getSupabase } = require('../supabase');

/**
 * Evaluates a transfer for fraud indicators using heuristic rules
 * 
 * All checks are database queries - fast and synchronous.
 * Each rule returns an alert object if triggered.
 * 
 * @param {Object} params - Transaction parameters
 * @param {string} params.senderWalletId - Sender wallet ID
 * @param {string} params.receiverWalletId - Receiver wallet ID  
 * @param {number} params.amount - Transfer amount
 * @returns {Array} Array of fraud alerts (empty if no suspicious activity)
 */
async function evaluateFraud({ senderWalletId, receiverWalletId, amount }) {
  const supabase = getSupabase();
  const alerts = [];
  
  // Load thresholds from environment - allows tuning without code changes
  const amountThreshold = Number(process.env.FRAUD_AMOUNT_THRESHOLD || 10000);
  const velocityCount = Number(process.env.FRAUD_VELOCITY_COUNT || 5);
  const velocityWindow = Number(process.env.FRAUD_VELOCITY_WINDOW_SECONDS || 60);

  // Rule 1: Amount Threshold
  // Flags large single transfers that exceed configured threshold
  // High severity - large amounts warrant manual review
  if (amount > amountThreshold) {
    alerts.push({ rule: 'amount_threshold', severity: 'high' });
  }

  // Rule 2: Velocity Check  
  // Counts transactions in sliding time window
  // Flags rapid successive transfers (possible account compromise)
  // Medium severity - could be legitimate bulk payments
  const since = new Date(Date.now() - velocityWindow * 1000).toISOString();
  const velocityRes = await supabase
    .from('transactions')
    .select('id', { count: 'exact', head: true })
    .eq('sender_wallet_id', senderWalletId)
    .gte('created_at', since);
  if (!velocityRes.error && (velocityRes.count || 0) >= velocityCount) {
    alerts.push({ rule: 'velocity', severity: 'medium' });
  }

  // Rule 3: New Recipient
  // Flags first-time transfers to a new recipient
  // Low severity - new recipients are common for new user relationships
  // Still useful for detecting social engineering attempts
  const recipientRes = await supabase
    .from('transactions')
    .select('id')
    .eq('sender_wallet_id', senderWalletId)
    .eq('receiver_wallet_id', receiverWalletId)
    .limit(1);
  if (!recipientRes.error && (!recipientRes.data || recipientRes.data.length === 0)) {
    alerts.push({ rule: 'new_recipient', severity: 'low' });
  }

  return alerts;
}

module.exports = { evaluateFraud };
