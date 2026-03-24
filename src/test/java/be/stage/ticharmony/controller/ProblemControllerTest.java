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

import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(ProblemController.class)
@Import({ProblemControllerTest.TestSecurityConfig.class, ThymeleafConfiguration.class})
class ProblemControllerTest {

    /**
     * Configuration de sécurité minimale pour les tests :
     * - Active @PreAuthorize (method security)
     * - Désactive CSRF pour simplifier les requêtes POST
     * - Requiert l'authentification pour toute requête
     */
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

    // ─── Mocks de tous les services ───────────────────────────────────────────

    @MockBean
    ProblemService problemService;
    @MockBean
    UserService userService;
    @MockBean
    NotificationService notificationService;
    @MockBean
    CommentService commentService;
    @MockBean
    UserProfileService userProfileService;
    @MockBean
    MailService mailService;

    // ─── Utilisateurs de test ─────────────────────────────────────────────────

    private User adminUser;
    private User memberUser;
    private User clientUser;

    @BeforeEach
    void setUp() {
        adminUser = new User();
        adminUser.setId(1L);
        adminUser.setLogin("admin");
        adminUser.setRole(UserRole.ADMIN);
        adminUser.setFirstname("Admin");
        adminUser.setLastname("Test");

        memberUser = new User();
        memberUser.setId(2L);
        memberUser.setLogin("member");
        memberUser.setRole(UserRole.MEMBER);
        memberUser.setFirstname("Tech");
        memberUser.setLastname("Test");

        clientUser = new User();
        clientUser.setId(3L);
        clientUser.setLogin("client");
        clientUser.setRole(UserRole.CLIENT);
        clientUser.setFirstname("Client");
        clientUser.setLastname("Test");

        // Stubs par défaut pour NotificationAdvice
        when(notificationService.getUnreadForUser(any())).thenReturn(List.of());
        // Stub Page pour getAllProblems (refactoring SQL pagination)
        when(problemService.getProblems(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));
    }

    // ─── Accès non authentifié ────────────────────────────────────────────────

    @Test
    void getAllProblems_unauthenticated_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/problems"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    void showDetails_unauthenticated_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/problems/1"))
                .andExpect(status().is3xxRedirection());
    }

    // ─── GET /problems ─────────────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void getAllProblems_asAdmin_returns200() throws Exception {
        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblems()).thenReturn(List.of());
        when(problemService.getTechnicianStats(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/problems"))
                .andExpect(status().isOk())
                .andExpect(view().name("listProblems"));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void getAllProblems_asMember_returns200() throws Exception {
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(problemService.getProblems()).thenReturn(List.of());
        when(problemService.getTechnicianStats(any(), any())).thenReturn(List.of());

        mockMvc.perform(get("/problems"))
                .andExpect(status().isOk())
                .andExpect(view().name("listProblems"));
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void getAllProblems_asClientWithoutSessionProfile_redirectsToSelectProfile() throws Exception {
        // ProfileRequiredInterceptor redirige les CLIENT sans profil en session
        mockMvc.perform(get("/problems"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/select-profile"));
    }

    // ─── GET /problems/{id} ────────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void showDetails_asAdmin_returns200() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.OPEN);
        p.setUser(adminUser); // requis par le template (problem.user.firstname)
        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(commentService.getCommentsByProblem(p)).thenReturn(List.of());
        when(userService.getUsersByRole(UserRole.MEMBER)).thenReturn(List.of());
        when(problemService.getProblemsByTechnician(any())).thenReturn(List.of());

        mockMvc.perform(get("/problems/1"))
                .andExpect(status().isOk())
                .andExpect(view().name("problemDetails"))
                .andExpect(model().attributeExists("problem", "currentUser"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void showDetails_unknownId_redirectsToList() throws Exception {
        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblem(999L)).thenReturn(null);

        mockMvc.perform(get("/problems/999"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems"));
    }

    // ─── POST /problems/{id}/close ─────────────────────────────────────────────

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void closeProblem_asAdmin_redirectsToClosedList() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.RESOLVED);
        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblem(1L)).thenReturn(p);

        mockMvc.perform(post("/problems/1/close").with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems?status=CLOSED"));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void closeProblem_asMember_returns403() throws Exception {
        mockMvc.perform(post("/problems/1/close"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void closeProblem_asClient_returns403() throws Exception {
        mockMvc.perform(post("/problems/1/close"))
                .andExpect(status().isForbidden());
    }

    // ─── POST /problems/{id}/confirm ───────────────────────────────────────────

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void confirmResolution_asClient_ownerOfTicket_redirectsToDetails() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.RESOLVED);
        p.setUser(clientUser);
        when(userService.findByLogin("client")).thenReturn(clientUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(userService.getUsersByRole(UserRole.ADMIN)).thenReturn(List.of());

        mockMvc.perform(post("/problems/1/confirm").with(csrf())
                        .sessionAttr("ACTIVE_PROFILE_ID", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/1"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void confirmResolution_asAdmin_returns403() throws Exception {
        mockMvc.perform(post("/problems/1/confirm").with(csrf()))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void confirmResolution_asMember_returns403() throws Exception {
        mockMvc.perform(post("/problems/1/confirm").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ─── POST /problems/{id}/resolve ───────────────────────────────────────────

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void submitResolution_asMember_assignedToTicket_redirectsToInProgressList() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.IN_PROGRESS);
        p.setTechnician(memberUser);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(userService.getUsersByRole(UserRole.ADMIN)).thenReturn(List.of());

        mockMvc.perform(post("/problems/1/resolve").with(csrf()).param("resolution", "Problème résolu."))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems?status=IN_PROGRESS"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void submitResolution_asAdmin_assignedToTicket_redirectsToDetails() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.IN_PROGRESS);
        p.setTechnician(adminUser);
        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(userService.getUsersByRole(UserRole.ADMIN)).thenReturn(List.of());

        mockMvc.perform(post("/problems/1/resolve").with(csrf()).param("resolution", "Validé."))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/1"));
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void submitResolution_asClient_redirectedByInterceptorToSelectProfile() throws Exception {
        // Le ProfileRequiredInterceptor redirige le CLIENT sans profil avant même que @PreAuthorize s'exécute
        mockMvc.perform(post("/problems/1/resolve").with(csrf()).param("resolution", "test"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/select-profile"));
    }

    // ─── POST /problems/{id}/reopen ────────────────────────────────────────────

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void reopenProblem_asClient_ownerOfResolvedTicket_redirectsToDetails() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.RESOLVED);
        p.setUser(clientUser);
        when(userService.findByLogin("client")).thenReturn(clientUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(userService.getUsersByRole(UserRole.ADMIN)).thenReturn(List.of());

        mockMvc.perform(post("/problems/1/reopen").with(csrf())
                        .sessionAttr("ACTIVE_PROFILE_ID", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/1"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void reopenProblem_asAdmin_returns403() throws Exception {
        mockMvc.perform(post("/problems/1/reopen").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ─── POST /problems/delete/{id} ────────────────────────────────────────────

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void deleteProblem_asAdmin_redirectsToList() throws Exception {
        mockMvc.perform(post("/problems/delete/1").with(csrf()))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems"));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void deleteProblem_asMember_returns403() throws Exception {
        mockMvc.perform(post("/problems/delete/1").with(csrf()))
                .andExpect(status().isForbidden());
    }

    // ─── POST /problems/{id}/assignTechnician ──────────────────────────────────

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void assignTechnician_asAdmin_validTechnician_redirectsToDetails() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.OPEN);
        p.setUser(adminUser); // rôle ADMIN → pas de notification client
        User tech = new User();
        tech.setId(2L);
        tech.setRole(UserRole.MEMBER);
        tech.setFirstname("Tech");
        tech.setLastname("Test");

        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(userService.getUser(2L)).thenReturn(tech);

        mockMvc.perform(post("/problems/1/assignTechnician").with(csrf())
                        .param("technicianId", "2")
                        .param("priority", "MEDIUM"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/1"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void assignTechnician_asAdmin_unassignWithZero_setsStatusOpenAndRedirects() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.IN_PROGRESS);
        p.setTechnician(memberUser);

        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblem(1L)).thenReturn(p);

        mockMvc.perform(post("/problems/1/assignTechnician").with(csrf())
                        .param("technicianId", "0")
                        .param("priority", "MEDIUM"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/1"));

        // Vérifie que le problème est bien repassé en OPEN
        org.mockito.Mockito.verify(problemService).updateProblem(
                org.mockito.ArgumentMatchers.argThat(prob ->
                        prob.getStatus() == Status.OPEN && prob.getTechnician() == null));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void assignTechnician_asMember_returns403() throws Exception {
        mockMvc.perform(post("/problems/1/assignTechnician").with(csrf())
                        .param("technicianId", "2")
                        .param("priority", "MEDIUM"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void assignTechnician_asClient_redirectedByInterceptorToSelectProfile() throws Exception {
        // Le ProfileRequiredInterceptor redirige les CLIENT sans profil avant @PreAuthorize
        mockMvc.perform(post("/problems/1/assignTechnician").with(csrf())
                        .param("technicianId", "2")
                        .param("priority", "MEDIUM"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/select-profile"));
    }

    // ─── GET /problems/{id}/take ───────────────────────────────────────────────

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void takeInCharge_asMember_unassignedOpenTicket_redirectsToDetails() throws Exception {
        Problem p = new Problem();
        p.setId(1L);
        p.setStatus(Status.OPEN);
        p.setTechnician(null);
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(problemService.getProblem(1L)).thenReturn(p);
        when(userService.getUsersByRole(UserRole.ADMIN)).thenReturn(List.of());

        mockMvc.perform(get("/problems/1/take"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/problems/1"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void takeInCharge_asAdmin_returns403() throws Exception {
        mockMvc.perform(get("/problems/1/take"))
                .andExpect(status().isForbidden());
    }
}