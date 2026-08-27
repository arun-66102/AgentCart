"""
Audit Tools — write and query the complete audit trail.
Every financial or agent action must be logged here.
"""
from sqlalchemy.orm import Session
from app.models.audit import AuditLog


def write_audit_log(
    db: Session,
    actor: str,
    action: str,
    detail: dict | None = None,
    session_id: str | None = None,
    order_id: str | None = None,
    status: str = "ok",
) -> dict:
    """
    Record an agent or system action.

    actor: 'buyer_agent' | 'merchant_agent' | 'system' | 'user' | 'policy_engine'
    action: short verb, e.g. 'intent_received', 'product_searched', 'payment_created'
    status: 'ok' | 'blocked' | 'failed'
    """
    try:
        log = AuditLog(
            session_id=session_id,
            order_id=order_id,
            actor=actor,
            action=action,
            detail=detail or {},
            status=status,
        )
        db.add(log)
        db.commit()
        db.refresh(log)
        return {
            "id": log.id,
            "actor": log.actor,
            "action": log.action,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
    except Exception as e:
        db.rollback()
        print(f"[WARN] write_audit_log failed: {e}")
        return {
            "id": 0,
            "actor": actor,
            "action": action,
            "status": status,
            "created_at": None,
        }


def get_audit_trail(
    db: Session,
    session_id: str | None = None,
    order_id: str | None = None,
    limit: int = 100,
) -> list[dict]:
    """Retrieve audit logs, optionally filtered by session or order."""
    q = db.query(AuditLog)
    if session_id:
        q = q.filter(AuditLog.session_id == session_id)
    if order_id:
        q = q.filter(AuditLog.order_id == order_id)

    logs = q.order_by(AuditLog.created_at.asc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "session_id": log.session_id,
            "order_id": log.order_id,
            "actor": log.actor,
            "action": log.action,
            "detail": log.detail,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]


def get_all_audit_logs(db: Session, limit: int = 200) -> list[dict]:
    """Return all recent audit logs for the dashboard."""
    logs = db.query(AuditLog).order_by(AuditLog.created_at.desc()).limit(limit).all()
    return [
        {
            "id": log.id,
            "session_id": log.session_id,
            "order_id": log.order_id,
            "actor": log.actor,
            "action": log.action,
            "detail": log.detail,
            "status": log.status,
            "created_at": log.created_at.isoformat() if log.created_at else None,
        }
        for log in logs
    ]
