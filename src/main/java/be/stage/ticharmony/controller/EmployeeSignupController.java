package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.time.LocalDateTime;

@Controller
@RequestMapping("/employeeSignup")
public class EmployeeSignupController {
    private final UserService userService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public EmployeeSignupController(UserService userService, BCryptPasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public String showEmployeeSignupForm(Model model) {
        model.addAttribute("user", new User());
        return "authentication/employeeSignup"; // Correspond à employeeSignup.html
    }

    @PostMapping
    public String registerEmployee(@ModelAttribute("user") User user, Model model) {
        boolean userExists = userService.getAllUsers().stream()
                .anyMatch(u -> u.getLogin().equalsIgnoreCase(user.getLogin())
                        || u.getEmail().equalsIgnoreCase(user.getEmail()));
        if (userExists) {
            model.addAttribute("errorMessage", "Un utilisateur avec ce login ou cet email existe déjà.");
            return "authentication/employeeSignup";
        }
        // Vérifie format email
        if (!user.getEmail().matches("^[\\w-.]+@[\\w-]+\\.[a-zA-Z]{2,}$")) {
            model.addAttribute("errorMessage", "Format d'adresse email invalide.");
            return "authentication/employeeSignup";
        }

        // Vérifie format téléphone (si champ non vide)
        if (user.getTelephone() != null && !user.getTelephone().isBlank()) {
            // Doit commencer par 0, suivi de 8 ou 9 chiffres, donc total 9 ou 10 chiffres
            if (!user.getTelephone().matches("^0[0-9]{8,9}$")) {
                model.addAttribute("errorMessage", "Le numéro de téléphone doit commencer par 0 et contenir 9 ou 10 chiffres (sans espaces ni caractères spéciaux).");
                return "authentication/employeeSignup";
            }
        }

        // Encoder le mot de passe
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        // Initialiser created_at
        user.setCreated_at(LocalDateTime.now());
        // Le rôle est automatiquement MEMBER (pas d'input dans le form)
        user.setRole(be.stage.ticharmony.model.UserRole.MEMBER);
        // Type "employee"
        user.setTypeClient("employee");
        // Langue par défaut
        user.setLangue("fr");

        userService.addUser(user);
        return "redirect:/login?employeeRegistrationSuccess=true";
    }
}
