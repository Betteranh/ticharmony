package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@Controller
@RequestMapping("/partners")
public class PartnerController {

    private final UserService userService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public PartnerController(UserService userService, BCryptPasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public String listPartners(Model model) {
        List<User> partners = userService.getUsersByRole(UserRole.CLIENT);
        long activeCount = partners.stream().filter(User::isActive).count();
        model.addAttribute("partners", partners);
        model.addAttribute("activeCount", activeCount);
        model.addAttribute("module", "partners");
        return "listPartners";
    }

    @GetMapping("/edit/{id}")
    public String editPartnerForm(@PathVariable Long id, Model model) {
        User partner = userService.getUser(id);
        if (partner == null) {
            return "redirect:/partners";
        }
        model.addAttribute("user", partner);
        return "formEditPartner";
    }

    @PostMapping("/edit/{id}")
    public String updatePartner(@PathVariable Long id, @ModelAttribute("user") User updatedUser, Model model) {
        User existing = userService.getUser(id);
        if (existing == null) {
            return "redirect:/partners";
        }

        existing.setFirstname(updatedUser.getFirstname());
        existing.setLastname(updatedUser.getLastname());
        existing.setEmail(updatedUser.getEmail());
        existing.setNomEntreprise(updatedUser.getNomEntreprise());
        existing.setTva(updatedUser.getTva());
        existing.setAdresse(updatedUser.getAdresse());
        existing.setTelephone(updatedUser.getTelephone());
        existing.setLangue(updatedUser.getLangue());
        existing.setSupportFrom(updatedUser.getSupportFrom());
        existing.setSupportTo(updatedUser.getSupportTo());

        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }

        userService.updateUser(existing);
        return "redirect:/partners";
    }

    @PostMapping("/{id}/toggle")
    public String toggleActive(@PathVariable Long id) {
        User user = userService.getUser(id);
        if (user != null) {
            boolean nowActive = !user.isActive();
            user.setActive(nowActive);
            if (nowActive) {
                user.setActiveFrom(LocalDate.now());
                user.setActiveTo(null);
            } else {
                user.setActiveTo(LocalDate.now());
            }
            userService.updateUser(user);
        }
        return "redirect:/partners";
    }
}