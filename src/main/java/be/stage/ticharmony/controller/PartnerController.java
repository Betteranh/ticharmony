package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequestMapping("/partners")
public class PartnerController {
    @Autowired
    private UserService userService;

    @GetMapping
    public String listPartners(Model model) {
        // récupère tous les utilisateurs de rôle CLIENT
        List<User> partners = userService.getUsersByRole(UserRole.CLIENT);
        model.addAttribute("partners", partners);
        model.addAttribute("module", "partners");
        return "listPartners";
    }

    // Formulaire d'édition
    @GetMapping("/edit/{id}")
    public String editPartnerForm(@PathVariable Long id, Model model) {
        User partner = userService.getUser(id);
        if (partner == null) {
            return "redirect:/partners";
        }
        model.addAttribute("user", partner); // Pour utiliser le même nom de champ qu’à l’inscription
        return "formEditPartner";
    }

    // Soumission formulaire édition
    @PostMapping("/edit/{id}")
    public String updatePartner(@PathVariable Long id, @ModelAttribute("user") User updatedUser, Model model) {
        User existing = userService.getUser(id);
        if (existing == null) {
            return "redirect:/partners";
        }
        // MÀJ des champs autorisés
        existing.setFirstname(updatedUser.getFirstname());
        existing.setLastname(updatedUser.getLastname());
        existing.setEmail(updatedUser.getEmail());
        existing.setNomEntreprise(updatedUser.getNomEntreprise());
        existing.setTva(updatedUser.getTva());
        existing.setTelephone(updatedUser.getTelephone());
        existing.setAdresse(updatedUser.getAdresse());
        existing.setLangue(updatedUser.getLangue());
        // Ne pas MAJ login/password ici (sauf si tu veux le permettre)
        userService.updateUser(existing); // À adapter selon ton service/repository
        return "redirect:/partners";
    }
}
