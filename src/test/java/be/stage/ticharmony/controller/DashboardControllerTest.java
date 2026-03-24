package be.stage.ticharmony.controller;

import be.stage.ticharmony.config.ThymeleafConfiguration;
import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.NotificationService;
import be.stage.ticharmony.service.ProblemService;
import be.stage.ticharmony.service.UserProfileService;
import be.stage.ticharmony.service.UserService;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(DashboardController.class)
@Import({DashboardControllerTest.TestSecurityConfig.class, ThymeleafConfiguration.class})
class DashboardControllerTest {

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
    @MockBean UserService userService;
    @MockBean UserProfileService userProfileService;
    @MockBean NotificationService notificationService;

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
    }

    // ─── /clientDashboard ─────────────────────────────────────────────────────

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void clientDashboard_asAdmin_returns403() throws Exception {
        mockMvc.perform(get("/clientDashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void clientDashboard_asMember_returns403() throws Exception {
        mockMvc.perform(get("/clientDashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void clientDashboard_asClient_withoutSessionProfile_redirectsToSelectProfile() throws Exception {
        // Pas d'attribut ACTIVE_PROFILE_ID en session → redirection
        mockMvc.perform(get("/clientDashboard"))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/select-profile"));
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void clientDashboard_asClient_withValidProfile_returns200() throws Exception {
        UserProfile profile = new UserProfile();
        profile.setId(1L);
        profile.setUser(clientUser);
        profile.setDisplayName("Alice");

        when(userService.findByLogin("client")).thenReturn(clientUser);
        when(userProfileService.findById(1L)).thenReturn(Optional.of(profile));
        when(problemService.getProblemsByUserProfile(profile)).thenReturn(List.of());

        mockMvc.perform(get("/clientDashboard")
                        .sessionAttr("ACTIVE_PROFILE_ID", 1L))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/clientDashboard"))
                .andExpect(model().attributeExists("activeProfile", "resolvedPending", "activeCount"));
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void clientDashboard_profileBelongsToOtherUser_redirectsToSelectProfile() throws Exception {
        User otherUser = new User();
        otherUser.setId(99L);

        UserProfile foreignProfile = new UserProfile();
        foreignProfile.setId(1L);
        foreignProfile.setUser(otherUser); // appartient à un autre utilisateur

        when(userService.findByLogin("client")).thenReturn(clientUser);
        when(userProfileService.findById(1L)).thenReturn(Optional.of(foreignProfile));

        mockMvc.perform(get("/clientDashboard")
                        .sessionAttr("ACTIVE_PROFILE_ID", 1L))
                .andExpect(status().is3xxRedirection())
                .andExpect(redirectedUrl("/select-profile"));
    }

    // ─── /adminDashboard ──────────────────────────────────────────────────────

    @Test
    void adminDashboard_unauthenticated_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/adminDashboard"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void adminDashboard_asMember_returns403() throws Exception {
        mockMvc.perform(get("/adminDashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void adminDashboard_asClient_returns403() throws Exception {
        mockMvc.perform(get("/adminDashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminDashboard_asAdmin_returns200() throws Exception {
        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblems()).thenReturn(List.of());

        mockMvc.perform(get("/adminDashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/adminDashboard"))
                .andExpect(model().attributeExists("totalTickets", "newTickets",
                        "inProgressTickets", "resolvedTickets",
                        "nonAssignedList", "resolvedList", "urgentList"));
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void adminDashboard_countsStatsCorrectly() throws Exception {
        User tech = new User();
        tech.setId(10L);

        Problem open = new Problem();
        open.setId(1L); open.setStatus(Status.OPEN); open.setPriority(Priority.MEDIUM);
        open.setUser(adminUser); open.setCreatedAt(java.time.LocalDateTime.now());

        Problem inProgress = new Problem();
        inProgress.setId(2L); inProgress.setStatus(Status.IN_PROGRESS); inProgress.setPriority(Priority.URGENT);
        inProgress.setUser(adminUser); inProgress.setTechnician(tech); inProgress.setCreatedAt(java.time.LocalDateTime.now());

        Problem resolved = new Problem();
        resolved.setId(3L); resolved.setStatus(Status.RESOLVED); resolved.setPriority(Priority.LOW);
        resolved.setUser(adminUser); resolved.setCreatedAt(java.time.LocalDateTime.now());

        Problem closed = new Problem();
        closed.setId(4L); closed.setStatus(Status.CLOSED); closed.setPriority(Priority.MEDIUM);
        closed.setUser(adminUser); closed.setCreatedAt(java.time.LocalDateTime.now());

        when(userService.findByLogin("admin")).thenReturn(adminUser);
        when(problemService.getProblems()).thenReturn(new ArrayList<>(List.of(open, inProgress, resolved, closed)));

        mockMvc.perform(get("/adminDashboard"))
                .andExpect(status().isOk())
                .andExpect(model().attribute("totalTickets", 3L))   // hors closed
                .andExpect(model().attribute("newTickets", 1L))
                .andExpect(model().attribute("inProgressTickets", 1L))
                .andExpect(model().attribute("resolvedTickets", 1L));
    }

    // ─── /memberDashboard ─────────────────────────────────────────────────────

    @Test
    void memberDashboard_unauthenticated_redirectsToLogin() throws Exception {
        mockMvc.perform(get("/memberDashboard"))
                .andExpect(status().is3xxRedirection());
    }

    @Test
    @WithMockUser(username = "admin", roles = "ADMIN")
    void memberDashboard_asAdmin_returns403() throws Exception {
        mockMvc.perform(get("/memberDashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "client", roles = "CLIENT")
    void memberDashboard_asClient_returns403() throws Exception {
        mockMvc.perform(get("/memberDashboard"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void memberDashboard_asMember_returns200() throws Exception {
        when(userService.findByLogin("member")).thenReturn(memberUser);
        when(problemService.getProblems()).thenReturn(new ArrayList<>());
        when(problemService.getProblems(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(new ArrayList<>());

        mockMvc.perform(get("/memberDashboard"))
                .andExpect(status().isOk())
                .andExpect(view().name("dashboard/memberDashboard"))
                .andExpect(model().attributeExists("totalTickets", "inProgressList",
                        "resolvedPendingList", "unassignedList"));
    }

    @Test
    @WithMockUser(username = "member", roles = "MEMBER")
    void memberDashboard_onlyShowsOwnTickets() throws Exception {
        User otherMember = new User();
        otherMember.setId(99L);

        Problem ownTicket = new Problem();
        ownTicket.setId(1L);
        ownTicket.setStatus(Status.IN_PROGRESS);
        ownTicket.setPriority(Priority.MEDIUM);
        ownTicket.setTechnician(memberUser);
        ownTicket.setCreatedAt(java.time.LocalDateTime.now());

        Problem otherTicket = new Problem();
        otherTicket.setId(2L);
        otherTicket.setStatus(Status.IN_PROGRESS);
        otherTicket.setPriority(Priority.HIGH);
        otherTicket.setTechnician(otherMember); // assigné à quelqu'un d'autre
        otherTicket.setCreatedAt(java.time.LocalDateTime.now());

        when(userService.findByLogin("member")).thenReturn(memberUser);
        // Le dashboard membre utilise getProblemsByTechnician, pas getProblems()
        when(problemService.getProblemsByTechnician(memberUser)).thenReturn(List.of(ownTicket));
        when(problemService.getProblems(any(org.springframework.data.jpa.domain.Specification.class)))
                .thenReturn(new ArrayList<>());

        mockMvc.perform(get("/memberDashboard"))
                .andExpect(status().isOk())
                // totalTickets ne compte que les tickets assignés au membre connecté
                .andExpect(model().attribute("totalTickets", 1L))
                .andExpect(model().attribute("inProgressTickets", 1L));
    }
}
