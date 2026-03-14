const { getSupabase } = require('../supabase');

function auditLogger() {
  return (req, res, next) => {
    res.on('finish', async () => {
      try {
        const actorId = req.user?.sub || null;
        const action = `${req.method} ${req.path}`;
        const entityType = 'request';
        const entityId = null;
        const metadata = {
          status: res.statusCode,
          ip: req.ip,
          userAgent: req.headers['user-agent'] || null
        };
        const supabase = getSupabase();
        // Best-effort audit write; request already completed.
        await supabase.from('audit_logs').insert({
          actor_id: actorId,
          action,
          entity_type: entityType,
          entity_id: entityId,
          metadata
        });
      } catch (err) {
        // avoid throwing inside finish handler
        console.error('audit log error', err);
      }
    });
    next();
  };
}

module.exports = { auditLogger };
