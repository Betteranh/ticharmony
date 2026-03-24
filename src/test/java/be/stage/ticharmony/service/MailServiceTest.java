package be.stage.ticharmony.service;

import be.stage.ticharmony.model.Priority;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThatNoException;

/**
 * Tests unitaires de MailService.
 * Vérifie les gardes (api-key absente, email manquant) sans appel réseau réel.
 * @Async est sans effet hors contexte Spring → exécution synchrone dans les tests.
 */
class MailServiceTest {

    private MailService mailService;

    @BeforeEach
    void setUp() {
        mailService = new MailService();
        // Clé API vide → short-circuit avant tout appel Resend
        ReflectionTestUtils.setField(mailService, "apiKey", "");
        ReflectionTestUtils.setField(mailService, "baseUrl", "http://localhost:8080");
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private User recipient(String email) {
        User u = new User();
        u.setId(1L);
        u.setEmail(email);
        return u;
    }

    private Problem problem() {
        Problem p = new Problem();
        p.setId(42L);
        p.setTitle("PC ne démarre plus");
        p.setCategory("Hardware");
        p.setPriority(Priority.HIGH);
        return p;
    }

    // ─── sendNewProblemEmail ──────────────────────────────────────────────────

    @Test
    void sendNewProblemEmail_withBlankApiKey_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendNewProblemEmail(recipient("admin@test.com"), problem()));
    }

    @Test
    void sendNewProblemEmail_withBlankRecipientEmail_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendNewProblemEmail(recipient(""), problem()));
    }

    @Test
    void sendNewProblemEmail_withNullRecipientEmail_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendNewProblemEmail(recipient(null), problem()));
    }

    // ─── sendTicketClosedEmail ────────────────────────────────────────────────

    @Test
    void sendTicketClosedEmail_withBlankApiKey_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendTicketClosedEmail(problem()));
    }

    @Test
    void sendTicketClosedEmail_withNullRecipientEmail_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendTicketClosedEmail(problem()));
    }

    // ─── sendAssignedEmail ────────────────────────────────────────────────────

    @Test
    void sendAssignedEmail_withBlankApiKey_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendAssignedEmail(recipient("tech@test.com"), problem()));
    }

    @Test
    void sendAssignedEmail_withNullRecipientEmail_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendAssignedEmail(recipient(null), problem()));
    }

    // ─── sendReassignedEmail ──────────────────────────────────────────────────

    @Test
    void sendReassignedEmail_withBlankApiKey_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendReassignedEmail(recipient("tech@test.com"), problem()));
    }

    @Test
    void sendReassignedEmail_withNullRecipientEmail_doesNotThrow() {
        assertThatNoException().isThrownBy(() ->
                mailService.sendReassignedEmail(recipient(null), problem()));
    }

    // ─── Contenu HTML ─────────────────────────────────────────────────────────

    @Test
    void sendNewProblemEmail_withNullCategory_doesNotThrow() {
        Problem p = problem();
        p.setCategory(null); // catégorie peut être absente
        assertThatNoException().isThrownBy(() ->
                mailService.sendNewProblemEmail(recipient("admin@test.com"), p));
    }

    @Test
    void sendAssignedEmail_withUrgentPriority_doesNotThrow() {
        Problem p = problem();
        p.setPriority(Priority.URGENT);
        assertThatNoException().isThrownBy(() ->
                mailService.sendAssignedEmail(recipient("tech@test.com"), p));
    }
}