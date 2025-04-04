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
        // Encoder le mot de passe
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        // Initialiser created_at
        user.setCreated_at(LocalDateTime.now());
        // Définir le rôle selon le choix dans le formulaire (ADMIN ou MEMBER)
        // L'objet user reçoit le rôle sélectionné par l'employé.
        // On laisse typeClient par défaut pour les employés : par exemple "employee"
        user.setTypeClient("employee");
        // Définir la langue par défaut si non renseignée
        if (user.getLangue() == null || user.getLangue().isEmpty()) {
            user.setLangue("fr");
        }
        userService.addUser(user);
        return "redirect:/login?employeeRegistrationSuccess=true";
    }
}
