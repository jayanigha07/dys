"""PDF report generation endpoint using ReportLab."""

import os
import io
import json
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DBSession

from database import get_db, Session, Prediction, GameResult

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    HRFlowable, KeepTogether
)
from reportlab.lib.enums import TA_CENTER, TA_LEFT

router = APIRouter(prefix="/api", tags=["report"])

# Load model stats for confusion matrix in report
_STATS_PATH = os.path.join(os.path.dirname(__file__), "..", "models", "model_stats.json")
with open(_STATS_PATH) as f:
    _stats = json.load(f)

# Color palette
PURPLE      = colors.HexColor("#7C3AED")
SOFT_PURPLE = colors.HexColor("#EDE9FE")
GREEN       = colors.HexColor("#10B981")
RED         = colors.HexColor("#EF4444")
YELLOW      = colors.HexColor("#F59E0B")
GREY_BG     = colors.HexColor("#F8F7FF")
DARK        = colors.HexColor("#1E1B4B")
LIGHT_GREY  = colors.HexColor("#E5E7EB")


def _risk_color(level: str):
    return {
        "Low": GREEN,
        "Medium": YELLOW,
        "High": RED,
    }.get(level, GREY_BG)


@router.get("/report/pdf/{session_id}")
def generate_pdf(session_id: int, db: DBSession = Depends(get_db)):
    session = db.query(Session).filter(Session.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    pred = db.query(Prediction).filter(
        Prediction.session_id == session_id
    ).order_by(Prediction.id.desc()).first()
    if not pred:
        raise HTTPException(status_code=404, detail="No prediction for this session")

    game_results = db.query(GameResult).filter(GameResult.session_id == session_id).all()

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        rightMargin=2 * cm,
        leftMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )

    styles = getSampleStyleSheet()
    story  = []

    # ── Header Banner ──────────────────────────────────────────────────────────
    title_style = ParagraphStyle(
        "Title", parent=styles["Normal"],
        fontSize=22, textColor=colors.white,
        fontName="Helvetica-Bold", alignment=TA_CENTER, spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "Sub", parent=styles["Normal"],
        fontSize=10, textColor=colors.white,
        fontName="Helvetica", alignment=TA_CENTER,
    )

    header_data = [[
        Paragraph("🧠 DysLexia Risk Screening Report", title_style),
    ]]
    header_sub = [[
        Paragraph("⚠️ This is a screening tool, NOT a medical diagnosis.", sub_style),
    ]]

    t = Table(header_data, colWidths=[17 * cm])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PURPLE),
        ("ROUNDEDCORNERS", [8]),
        ("TOPPADDING", (0, 0), (-1, -1), 16),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(t)

    t2 = Table(header_sub, colWidths=[17 * cm])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#5B21B6")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(t2)
    story.append(Spacer(1, 0.5 * cm))

    # ── Child Info ─────────────────────────────────────────────────────────────
    info_style = ParagraphStyle("Info", parent=styles["Normal"], fontSize=11, leading=18)
    label_style = ParagraphStyle("Label", parent=styles["Normal"], fontSize=9,
                                 textColor=colors.grey, fontName="Helvetica")

    info_data = [
        [
            Paragraph(f"<b>Child Name</b>", label_style),
            Paragraph(f"<b>Age</b>", label_style),
            Paragraph(f"<b>Date</b>", label_style),
            Paragraph(f"<b>Session ID</b>", label_style),
        ],
        [
            Paragraph(session.child_name or "—", info_style),
            Paragraph(str(session.child_age) + " yrs" if session.child_age else "—", info_style),
            Paragraph(datetime.now().strftime("%d %b %Y"), info_style),
            Paragraph(str(session_id), info_style),
        ],
    ]
    t_info = Table(info_data, colWidths=[4.25 * cm] * 4)
    t_info.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), GREY_BG),
        ("ROWBACKGROUNDS", (0, 0), (-1, -1), [SOFT_PURPLE, colors.white]),
        ("BOX", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LIGHT_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_info)
    story.append(Spacer(1, 0.5 * cm))

    # ── Risk Classification ────────────────────────────────────────────────────
    risk_color = _risk_color(pred.risk_level)
    risk_style = ParagraphStyle("Risk", parent=styles["Normal"],
                                fontSize=20, fontName="Helvetica-Bold",
                                textColor=colors.white, alignment=TA_CENTER)
    risk_sub = ParagraphStyle("RiskSub", parent=styles["Normal"],
                              fontSize=11, textColor=colors.white, alignment=TA_CENTER)

    risk_label_text = "✅ No Significant Risk Detected" if pred.risk_label == 0 else "⚠️ Potential Dyslexia Risk Detected"

    risk_data = [[Paragraph(risk_label_text, risk_style)]]
    risk_prob = [[Paragraph(
        f"Confidence: Risk {int(pred.probability_risk * 100)}% | No Risk {int(pred.probability_no_risk * 100)}%",
        risk_sub
    )]]

    t_risk = Table(risk_data, colWidths=[17 * cm])
    t_risk.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), risk_color),
        ("TOPPADDING", (0, 0), (-1, -1), 14),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("ROUNDEDCORNERS", [6]),
    ]))
    t_risk_prob = Table(risk_prob, colWidths=[17 * cm])
    t_risk_prob.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), risk_color),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
    ]))
    story.append(t_risk)
    story.append(t_risk_prob)
    story.append(Spacer(1, 0.5 * cm))

    # ── Performance Metrics ────────────────────────────────────────────────────
    h2 = ParagraphStyle("H2", parent=styles["Heading2"], fontSize=13,
                        textColor=DARK, fontName="Helvetica-Bold", spaceBefore=8)

    story.append(Paragraph("📊 Performance Metrics", h2))

    feat_data = [
        ["Metric", "Child's Score", "Status"],
        ["Accuracy Score",      f"{pred.accuracy_score:.2f}",      "🟢 Good" if pred.accuracy_score > 0.7 else "🔴 Needs Attention"],
        ["Avg Response Time (s)", f"{pred.avg_response_time:.2f}", "🟢 Good" if pred.avg_response_time < 3.0 else "🔴 Slow"],
        ["Error Rate",          f"{pred.error_rate:.2f}",          "🟢 Good" if pred.error_rate < 0.2 else "🔴 High"],
        ["Confusion Score",     f"{pred.confusion_score:.2f}",     "🟢 Good" if pred.confusion_score < 0.3 else "🔴 High"],
        ["Retry Count",         f"{int(pred.retry_count)}",        "🟢 Good" if pred.retry_count < 3 else "🔴 High"],
        ["Memory Score",        f"{pred.memory_score:.2f}",        "🟢 Good" if pred.memory_score > 0.65 else "🔴 Low"],
        ["Reading Time (s)",    f"{pred.reading_time:.2f}",        "🟢 Good" if pred.reading_time < 4.5 else "🔴 Slow"],
    ]

    t_feat = Table(feat_data, colWidths=[6.5 * cm, 5 * cm, 5.5 * cm])
    t_feat.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, 0), 10),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_PURPLE]),
        ("FONTSIZE", (0, 1), (-1, -1), 9),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LIGHT_GREY),
        ("BOX", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_feat)
    story.append(Spacer(1, 0.4 * cm))

    # ── Model Evaluation (Confusion Matrix) ────────────────────────────────────
    story.append(Paragraph("🤖 Model Evaluation (Population-Level)", h2))

    cm_matrix = _stats["confusion_matrix"]
    tn, fp, fn, tp = cm_matrix[0][0], cm_matrix[0][1], cm_matrix[1][0], cm_matrix[1][1]

    summary_text = ParagraphStyle("Sm", parent=styles["Normal"], fontSize=9,
                                  textColor=colors.grey, leading=14)
    story.append(Paragraph(
        f"Accuracy: {_stats['accuracy']*100:.1f}% | F1-Score: {_stats['f1_score']:.3f} | "
        f"Precision: {_stats['precision']:.3f} | Recall: {_stats['recall']:.3f}",
        summary_text
    ))
    story.append(Spacer(1, 0.2 * cm))

    cm_data = [
        ["", "Predicted: No Risk", "Predicted: Risk"],
        ["Actual: No Risk", f"TN = {tn}", f"FP = {fp}"],
        ["Actual: Risk",    f"FN = {fn}", f"TP = {tp}"],
    ]
    t_cm = Table(cm_data, colWidths=[5 * cm, 6 * cm, 6 * cm])
    t_cm.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), DARK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("BACKGROUND", (0, 0), (0, -1), DARK),
        ("TEXTCOLOR", (0, 0), (0, -1), colors.white),
        ("BACKGROUND", (1, 1), (1, 1), colors.HexColor("#D1FAE5")),  # TN green
        ("BACKGROUND", (2, 1), (2, 1), colors.HexColor("#FEE2E2")),  # FP red
        ("BACKGROUND", (1, 2), (1, 2), colors.HexColor("#FEE2E2")),  # FN red
        ("BACKGROUND", (2, 2), (2, 2), colors.HexColor("#D1FAE5")),  # TP green
        ("FONTNAME", (0, 0), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 0), (-1, -1), 10),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
        ("BOX", (0, 0), (-1, -1), 0.75, DARK),
        ("TOPPADDING", (0, 0), (-1, -1), 10),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story.append(t_cm)
    story.append(Spacer(1, 0.4 * cm))

    # ── Feature Importance ────────────────────────────────────────────────────
    story.append(Paragraph("📌 Feature Importance (ML Model)", h2))
    fi = _stats["feature_importances"]
    fi_sorted = sorted(fi.items(), key=lambda x: x[1], reverse=True)

    fi_data = [["Feature", "Importance", "Impact Bar"]] + [
        [name.replace("_", " ").title(), f"{val:.3f}",
         "█" * int(val * 40) if val > 0.01 else "▏"]
        for name, val in fi_sorted
    ]
    t_fi = Table(fi_data, colWidths=[5.5 * cm, 3 * cm, 8.5 * cm])
    t_fi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_PURPLE]),
        ("FONTSIZE", (0, 0), (-1, -1), 9),
        ("INNERGRID", (0, 0), (-1, -1), 0.25, LIGHT_GREY),
        ("BOX", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("TEXTCOLOR", (2, 1), (2, -1), PURPLE),
    ]))
    story.append(t_fi)
    story.append(Spacer(1, 0.4 * cm))

    # ── Recommendations ────────────────────────────────────────────────────────
    story.append(Paragraph("💡 Personalized Recommendations", h2))
    rec_style = ParagraphStyle("Rec", parent=styles["Normal"], fontSize=10,
                               leading=16, leftIndent=16)

    recs = pred.recommendations or ["Continue regular reading practice."]
    for i, r in enumerate(recs, 1):
        story.append(Paragraph(f"{i}. {r}", rec_style))

    story.append(Spacer(1, 0.4 * cm))

    # ── Games Played ────────────────────────────────────────────────────────────
    if game_results:
        story.append(Paragraph("🎮 Game Results Summary", h2))
        game_data = [["Game", "Accuracy", "Response Time", "Error Rate", "Memory Score"]]
        for g in game_results:
            game_data.append([
                g.game_name,
                f"{g.accuracy_score:.2f}",
                f"{g.avg_response_time:.2f}s",
                f"{g.error_rate:.2f}",
                f"{g.memory_score:.2f}",
            ])
        t_game = Table(game_data, colWidths=[4.5 * cm, 3 * cm, 3.5 * cm, 3 * cm, 3 * cm])
        t_game.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), PURPLE),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, SOFT_PURPLE]),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("INNERGRID", (0, 0), (-1, -1), 0.25, LIGHT_GREY),
            ("BOX", (0, 0), (-1, -1), 0.5, LIGHT_GREY),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_game)
        story.append(Spacer(1, 0.4 * cm))

    # ── Footer disclaimer ──────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=LIGHT_GREY))
    disclaimer_style = ParagraphStyle("Disc", parent=styles["Normal"],
                                      fontSize=8, textColor=colors.grey,
                                      alignment=TA_CENTER, leading=12)
    story.append(Spacer(1, 0.2 * cm))
    story.append(Paragraph(
        "⚠️ IMPORTANT DISCLAIMER: This report is generated by an AI-based screening tool and is NOT a medical "
        "diagnosis. It is intended solely to help identify potential areas of concern for early intervention. "
        "Please consult a qualified educational psychologist or specialist for a formal assessment.",
        disclaimer_style
    ))
    story.append(Paragraph(
        f"Generated on {datetime.now().strftime('%d %B %Y at %H:%M')} | DysLexia Screening Tool v1.0",
        disclaimer_style
    ))

    # ── Build PDF ──────────────────────────────────────────────────────────────
    doc.build(story)
    buf.seek(0)

    filename = f"dyslexia_screening_{session_id}_{datetime.now().strftime('%Y%m%d')}.pdf"
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
