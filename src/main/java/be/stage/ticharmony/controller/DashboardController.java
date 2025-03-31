package be.stage.ticharmony.controller;

import be.stage.ticharmony.config.CustomUserDetailsService;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @PreAuthorize("hasRole('CLIENT')")
    @GetMapping("/clientDashboard")
    public String clientDashboard(Model model) {
        // Vous pouvez ajouter des attributs spécifiques au dashboard client ici
        return "dashboard/clientDashboard"; // Correspond à src/main/resources/templates/clientDashboard.html
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @GetMapping("/memberDashboard")
    public String memberDashboard(Model model) {
        // Vous pouvez ajouter des attributs spécifiques au dashboard membre ici
        return "dashboard/memberDashboard"; // Correspond à src/main/resources/templates/memberDashboard.html
    }
}
