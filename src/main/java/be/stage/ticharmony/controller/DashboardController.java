package be.stage.ticharmony.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class DashboardController {

    @PreAuthorize("hasRole('CLIENT')")
    @GetMapping("/clientDashboard")
    public String clientDashboard(Model model) {
        // Vous pouvez ajouter des attributs spécifiques au dashboard client ici
        model.addAttribute("module", "dashboard");
        return "dashboard/clientDashboard"; // Correspond à src/main/resources/templates/clientDashboard.html
    }

    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    @GetMapping("/memberDashboard")
    public String memberDashboard(Model model) {
        // Vous pouvez ajouter des attributs spécifiques au dashboard membre ici
        model.addAttribute("module", "dashboard");
        return "dashboard/memberDashboard"; // Correspond à src/main/resources/templates/memberDashboard.html
    }
}
