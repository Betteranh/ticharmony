package be.stage.ticharmony.controller;

import be.stage.ticharmony.config.ThymeleafConfiguration;
import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(CommentController.class)
@Import({CommentControllerTest.TestSecurityConfig.class, ThymeleafConfiguration.class})
class CommentControllerTest {

    @TestConfiguration
    @EnableMethodSecurity(prePostEnabled = true)
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain testFilterChain(HttpSecurity http) throws Exception {
            CsrfTokenRequestAttributeHandler handler = new CsrfTokenRequestAttributeHandler();
            handler.setCsrfRequestAttributeName("_csrf");
            return http
                    .csrf(csrf -> csrf
                            .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                            .csrfTokenRequestHandler(handler))
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .formLogin(form -> form.loginPage("/login").permitAll())
                    .build();
        }
    }

    @Autowired
    MockMvc mockMvc;

    @MockBean ProblemService problemService;
    @MockBean CommentService commentService;
    @MockBean NotificationService notificationService;
    @MockBean MailService mailService;
    @MockBean UserService userService;
    @MockBean UserProfileService userProfileService;

    private User adminUser;
    private User memberUser;
    private User clientUser;
    private Problem problem;
    private Comment savedComment;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setLogin("admin");
        adminUser.setRole(UserRole.ADMIN);

        memberUser = new User();
        memberUser.setId(2L);
        memberUser.setLogin("member");
        memberUser.setRole(UserRole.MEMBER);

        clientUser = new User();
        clientUser.setId(3L);
        clientUser.setLogin("client");
        clientUser.setRole(UserRole.CLIENT);
        clientUser.setEmail("client@test.com");

        problem = new Problem();
        problem.setId(42L);
        problem.setStatus(Status.IN_PROGRESS);

        savedComment = new Comment();
        savedComment.setId(100L);
        savedComment.setContent("Commentaire test");
        savedComment.setAuthor(memberUser);
        savedComment.setProblem(problem);

        // Stub par défaut pour NotificationAdvice
        when(notificationService.getUnreadForUser(any())).thenReturn(List.of());
    }

    // ─── Accès non authentifié ────────────────────────────────────────────────

    @Test
    void addComment_unauthenticated_redirectsToLogin() throws Exception {
        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "Bonjour"))
                .andExpect(status().is3xxRedirection());
    }

    // ─── Contenu invalide ─────────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_blankContent_redirectsWithoutSaving() throws Exception {
        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "   "))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/42"));

        verify(commentService, never()).addComment(any(), any(), any());
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_emptyContent_redirectsWithoutSaving() throws Exception {
        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", ""))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/42"));

        verify(commentService, never()).addComment(any(), any(), any());
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_contentExceeds5000Chars_redirectsWithoutSaving() throws Exception {
        String tooLong = "A".repeat(5001);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", tooLong))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/42"));

        verify(commentService, never()).addComment(any(), any(), any());
    }

    // ─── Problème introuvable ─────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_unknownProblem_redirectsToList() throws Exception {
        when(problemService.getProblem(42L)).thenReturn(null);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "Commentaire"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems"));

        verify(commentService, never()).addComment(any(), any(), any());
    }

    // ─── Ajout valide ─────────────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_validContent_savesAndRedirectsToProblem() throws Exception {
        when(problemService.getProblem(42L)).thenReturn(problem);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(commentService.addComment(eq(problem), eq(memberUser), any())).thenReturn(savedComment);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "Voici mon commentaire"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/42"));

        verify(commentService).addComment(eq(problem), eq(memberUser), eq("Voici mon commentaire"));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_contentIsTrimmedBeforeSave() throws Exception {
        when(problemService.getProblem(42L)).thenReturn(problem);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(commentService.addComment(any(), any(), any())).thenReturn(savedComment);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "  texte avec espaces  "))
                .andExpect(status().is3xxRedirection());

        verify(commentService).addComment(any(), any(), eq("texte avec espaces"));
    }

    // ─── Notifications ────────────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_notifiesTechnician_whenTechnicianIsNotAuthor() throws Exception {
        User technician = new User();
        technician.setId(10L);
        problem.setTechnician(technician); // technicien différent du member (id=2)

        when(problemService.getProblem(42L)).thenReturn(problem);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(commentService.addComment(any(), any(), any())).thenReturn(savedComment);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "Traitement en cours"))
                .andExpect(status().is3xxRedirection());

        verify(notificationService).notifyOnce(technician, problem, NotificationType.NEW_COMMENT);
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_doesNotNotifyTechnician_whenAuthorIsTheTechnician() throws Exception {
        problem.setTechnician(memberUser); // le member est lui-même le technicien

        when(problemService.getProblem(42L)).thenReturn(problem);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(commentService.addComment(any(), any(), any())).thenReturn(savedComment);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "Je commente mon propre ticket"))
                .andExpect(status().is3xxRedirection());

        verify(notificationService, never()).notifyOnce(eq(memberUser), any(), eq(NotificationType.NEW_COMMENT));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void addComment_notifiesClientAndSendsEmail_whenClientIsNotAuthor() throws Exception {
        problem.setUser(clientUser); // le client du ticket est différent de l'auteur (member)

        when(problemService.getProblem(42L)).thenReturn(problem);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(commentService.addComment(any(), any(), any())).thenReturn(savedComment);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .param("content", "Mise à jour pour le client"))
                .andExpect(status().is3xxRedirection());

        verify(notificationService).notifyOnce(eq(clientUser), isNull(), eq(problem), eq(NotificationType.NEW_COMMENT));
        verify(mailService).sendNewCommentEmail(problem, savedComment);
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void addComment_byClient_doesNotSendEmailToSelf() throws Exception {
        problem.setUser(clientUser); // le client commente son propre ticket

        when(problemService.getProblem(42L)).thenReturn(problem);
        when(userService.findByLogin("client")).thenReturn(clientUser);
        when(commentService.addComment(any(), any(), any())).thenReturn(savedComment);

        mockMvc.perform(post("/problems/42/comments").with(csrf())
                        .sessionAttr("ACTIVE_PROFILE_ID", 1L)
                        .param("content", "Je commente mon propre ticket"))
                .andExpect(status().is3xxRedirection());

        // Pas de notification ni email pour soi-même
        verify(notificationService, never()).notifyOnce(eq(clientUser), any(), eq(problem), eq(NotificationType.NEW_COMMENT));
        verify(mailService, never()).sendNewCommentEmail(any(), any());
    }
}