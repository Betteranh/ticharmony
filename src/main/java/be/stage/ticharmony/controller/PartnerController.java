package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
public class PartnerController {
    @Autowired
    private UserService userService;

    @GetMapping("/partners")
    public String listPartners(Model model) {
        // récupère tous les utilisateurs de rôle CLIENT
        List<User> partners = userService.getUsersByRole(UserRole.CLIENT);
        model.addAttribute("partners", partners);
        model.addAttribute("module", "partners");
        return "listPartners";
    }
}
