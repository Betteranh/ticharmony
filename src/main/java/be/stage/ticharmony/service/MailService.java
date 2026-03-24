package be.stage.ticharmony.service;

import be.stage.ticharmony.model.Comment;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import com.resend.Resend;
import com.resend.core.exception.ResendException;
import com.resend.services.emails.model.CreateEmailOptions;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class MailService {

    private static final Logger log = LoggerFactory.getLogger(MailService.class);

    @Value("${app.mail.from:TicHarmony <onboarding@resend.dev>}")
    private String from;

    @Value("${resend.api-key:}")
    private String apiKey;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    @Value("${app.mail.override-to:}")
    private String overrideTo;

    // ─── Triggers publics ────────────────────────────────────────────────────

    /** Envoyé aux admins et members quand un nouveau ticket est créé sans technicien. */
    @Async
    public void sendNewProblemEmail(User recipient, Problem problem) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Nouveau ticket #" + problem.getId() + " — " + problem.getTitle();
        String html = buildLayout(
                "Nouveau ticket créé",
                "Un nouveau ticket vient d'être ouvert et est en attente de prise en charge.",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())},
                        {"Catégorie", escape(problem.getCategory())}
                },
                ticketUrl,
                "Voir le ticket",
                "#2563eb"
        );
        send(recipient.getEmail(), subject, html);
    }

    /** Envoyé au client quand son dossier est officiellement clôturé. */
    @Async
    public void sendTicketClosedEmail(Problem problem) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Votre dossier #" + problem.getId() + " est clôturé";
        String html = buildLayout(
                "Votre dossier est clôturé",
                "Votre demande a été traitée et clôturée. Merci de votre confiance.",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())},
                        {"Catégorie", escape(problem.getCategory())}
                },
                ticketUrl,
                "Consulter mon dossier",
                "#16a34a"
        );
        send(ticketEmail(problem), subject, html);
    }

    /** Envoyé au technicien quand un ticket lui est assigné. */
    @Async
    public void sendAssignedEmail(User recipient, Problem problem) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Ticket #" + problem.getId() + " assigné — " + problem.getTitle();
        String html = buildLayout(
                "Un ticket vous a été assigné",
                "Un ticket vous a été attribué et est en attente de traitement.",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())},
                        {"Catégorie", escape(problem.getCategory())},
                        {"Priorité", formatPriority(problem.getPriority().name())}
                },
                ticketUrl,
                "Voir le ticket",
                "#7c3aed"
        );
        send(recipient.getEmail(), subject, html);
    }

    /** Envoyé au technicien quand un ticket lui est retiré / réassigné. */
    @Async
    public void sendReassignedEmail(User recipient, Problem problem) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Ticket #" + problem.getId() + " réassigné";
        String html = buildLayout(
                "Ticket retiré de votre liste",
                "Le ticket suivant vous a été retiré et a été réassigné à un autre technicien.",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())},
                        {"Catégorie", escape(problem.getCategory())}
                },
                ticketUrl,
                "Voir le ticket",
                "#d97706"
        );
        send(recipient.getEmail(), subject, html);
    }

    /** Envoyé au client avec ses identifiants lors de la création ou réinitialisation du compte. */
    @Async
    public void sendWelcomeCredentialsEmail(User user, String rawPassword, String rawProfilePassword) {
        String loginUrl = baseUrl + "/login";
        String subject = "Vos identifiants d'accès — TicHarmony";

        StringBuilder extraRows = new StringBuilder();
        if (rawProfilePassword != null && !rawProfilePassword.isBlank()) {
            extraRows.append("""
                    <tr>
                      <td style="padding:6px 12px;color:#64748b;font-size:13px;white-space:nowrap;">Mot de passe profils</td>
                      <td style="padding:6px 12px;color:#1e293b;font-size:13px;font-weight:600;font-family:monospace,monospace;">%s</td>
                    </tr>
                    """.formatted(escape(rawProfilePassword)));
        }

        String html = buildLayout(
                "Vos identifiants TicHarmony",
                "Votre espace client est prêt. Voici vos identifiants de connexion. Conservez-les en lieu sûr et ne les partagez pas.",
                new String[][]{
                        {"Entreprise", escape(user.getNomEntreprise())},
                        {"Identifiant", escape(user.getLogin())},
                        {"Mot de passe", escape(rawPassword)}
                },
                loginUrl,
                "Accéder à mon espace",
                "#2563eb"
        ).replace("</tbody>", extraRows + "</tbody>");

        send(user.getEmail(), subject, html);
    }

    /** Envoyé au client quand son ticket est pris en charge par un technicien. */
    @Async
    public void sendTicketInProgressEmail(Problem problem) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Votre dossier #" + problem.getId() + " est en cours de traitement";
        String techName = problem.getTechnician() != null
                ? escape(problem.getTechnician().getFirstname() + " " + problem.getTechnician().getLastname())
                : "un technicien";
        String html = buildLayout(
                "Votre dossier est pris en charge",
                "Bonne nouvelle ! Votre demande a été prise en charge par " + techName + " et est en cours de traitement.",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())},
                        {"Catégorie", escape(problem.getCategory())},
                        {"Priorité", formatPriority(problem.getPriority().name())}
                },
                ticketUrl,
                "Suivre mon dossier",
                "#7c3aed"
        );
        send(ticketEmail(problem), subject, html);
    }

    /** Envoyé au client et aux admins quand un ticket est marqué RESOLVED — demande de validation. */
    @Async
    public void sendTicketResolvedEmail(User recipient, Problem problem) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Votre dossier #" + problem.getId() + " a été résolu — validation requise";
        String html = buildLayout(
                "Votre dossier a été résolu",
                "Une solution a été apportée à votre demande. Merci de consulter la résolution et de valider ou de rouvrir le dossier si nécessaire.",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())},
                        {"Catégorie", escape(problem.getCategory())},
                        {"Résolution", escape(problem.getResolution())}
                },
                ticketUrl,
                "Valider ou rouvrir mon dossier",
                "#16a34a"
        );
        // Client → email du ticket ; Admin/Member → email du compte
        String to = recipient.getRole() == UserRole.CLIENT ? ticketEmail(problem) : recipient.getEmail();
        send(to, subject, html);
    }

    /** Envoyé au client quand un commentaire est ajouté à son ticket. */
    @Async
    public void sendNewCommentEmail(Problem problem, Comment comment) {
        String ticketUrl = baseUrl + "/problems/" + problem.getId();
        String subject = "Nouveau message sur votre dossier #" + problem.getId();
        String authorName = comment.getAuthor() != null
                ? escape(comment.getAuthor().getFirstname() + " " + comment.getAuthor().getLastname())
                : "L'équipe technique";
        String html = buildLayout(
                "Nouveau message sur votre dossier",
                authorName + " a ajouté un message sur votre dossier :<br><br>"
                        + "<div style=\"background:#f1f5f9;border-left:4px solid #2563eb;padding:12px 16px;border-radius:0 8px 8px 0;font-size:14px;color:#1e293b;line-height:1.6;\">"
                        + escape(comment.getContent())
                        + "</div>",
                new String[][]{
                        {"Ticket", "#" + problem.getId() + " — " + escape(problem.getTitle())}
                },
                ticketUrl,
                "Voir le dossier",
                "#2563eb"
        );
        send(ticketEmail(problem), subject, html);
    }

    // ─── Utilitaires ─────────────────────────────────────────────────────────

    /** Retourne l'email renseigné dans le ticket (TicketUserInfo), pas celui du compte. */
    private String ticketEmail(Problem problem) {
        if (problem.getTicketUserInfo() != null) {
            return problem.getTicketUserInfo().getEmail();
        }
        return null;
    }

    // ─── Envoi ───────────────────────────────────────────────────────────────

    private void send(String to, String subject, String html) {
        String effectiveTo = (overrideTo != null && !overrideTo.trim().isBlank()) ? overrideTo.trim() : to;
        if (effectiveTo != null && !effectiveTo.equals(to)) {
            log.info("Override destinataire : {} → {}", to, effectiveTo);
        }
        if (apiKey == null || apiKey.isBlank()) {
            log.warn("Resend API key non configurée — email non envoyé à {}", effectiveTo);
            return;
        }
        if (effectiveTo == null || effectiveTo.isBlank()) {
            log.warn("Destinataire sans email — email non envoyé (sujet: {})", subject);
            return;
        }
        try {
            Resend resend = new Resend(apiKey);
            CreateEmailOptions options = CreateEmailOptions.builder()
                    .from(from)
                    .to(effectiveTo)
                    .subject(subject)
                    .html(html)
                    .build();
            resend.emails().send(options);
            log.info("Email envoyé à {} : {}", effectiveTo, subject);
        } catch (Exception e) {
            log.error("Échec envoi email à {} : {}", effectiveTo, e.getMessage());
        }
    }

    // ─── Template HTML ───────────────────────────────────────────────────────

    private String buildLayout(String title, String intro, String[][] details,
                               String ctaUrl, String ctaLabel, String ctaColor) {
        StringBuilder rows = new StringBuilder();
        for (String[] row : details) {
            if (row[1] != null && !row[1].isBlank()) {
                rows.append("""
                        <tr>
                          <td style="padding:6px 12px;color:#64748b;font-size:13px;white-space:nowrap;">%s</td>
                          <td style="padding:6px 12px;color:#1e293b;font-size:13px;font-weight:600;">%s</td>
                        </tr>
                        """.formatted(row[0], row[1]));
            }
        }

        return """
                <!DOCTYPE html>
                <html lang="fr">
                <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
                <body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
                  <table width="100%%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
                    <tr><td align="center">
                      <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%%;">
                        <!-- Header -->
                        <tr>
                          <td style="background:#1e293b;border-radius:12px 12px 0 0;padding:24px 32px;">
                            <span style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.5px;">Tic</span><span style="font-size:22px;font-weight:700;color:#60a5fa;letter-spacing:-0.5px;">Harmony</span>
                          </td>
                        </tr>
                        <!-- Body -->
                        <tr>
                          <td style="background:#ffffff;padding:32px;">
                            <h1 style="margin:0 0 12px;font-size:20px;font-weight:700;color:#1e293b;">%s</h1>
                            <p style="margin:0 0 24px;font-size:15px;color:#475569;line-height:1.6;">%s</p>
                            <!-- Details table -->
                            <table cellpadding="0" cellspacing="0" style="width:100%%;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                              <tbody>%s</tbody>
                            </table>
                            <!-- CTA -->
                            <div style="margin-top:28px;text-align:center;">
                              <a href="%s" style="display:inline-block;background:%s;color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;padding:12px 28px;border-radius:8px;">%s →</a>
                            </div>
                          </td>
                        </tr>
                        <!-- Footer -->
                        <tr>
                          <td style="background:#f8fafc;border-top:1px solid #e2e8f0;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;">
                            <p style="margin:0;font-size:12px;color:#94a3b8;">Vous recevez cet email car vous êtes membre de l'espace TicHarmony.<br>Ne répondez pas directement à cet email.</p>
                          </td>
                        </tr>
                      </table>
                    </td></tr>
                  </table>
                </body>
                </html>
                """.formatted(title, intro, rows.toString(), ctaUrl, ctaColor, ctaLabel);
    }

    private String escape(String s) {
        if (s == null) return "";
        return s.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;");
    }

    private String formatPriority(String priority) {
        return switch (priority) {
            case "URGENT" -> "🔴 Urgent";
            case "HIGH"   -> "🟠 Haute";
            case "MEDIUM" -> "🔵 Moyenne";
            case "LOW"    -> "🟢 Basse";
            default       -> priority;
        };
    }
}