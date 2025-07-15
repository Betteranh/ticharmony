package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.service.UserService;
import be.stage.ticharmony.model.UserRole;
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
@RequestMapping("/registration")
public class RegistrationController {

    private final UserService userService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public RegistrationController(UserService userService, BCryptPasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    public String showRegistrationForm(Model model) {
        model.addAttribute("user", new User());
        return "authentication/registration"; // Le template registration.html
    }

    @PostMapping
    public String registerUser(@ModelAttribute("user") User user, Model model) {
        // Vérifier que l'user n'existe pas déjà
        /**if (userService.getAllUsers().stream().anyMatch(u -> u.getLogin().equalsIgnoreCase(user.getLogin()))) {
         model.addAttribute("errorMessage", "Cet utilisateur existe déjà.");
         return "authentication/registration";
         }*/
        boolean userExists = userService.getAllUsers().stream()
                .anyMatch(u -> u.getLogin().equalsIgnoreCase(user.getLogin())
                        || u.getEmail().equalsIgnoreCase(user.getEmail()));

        if (userExists) {
            model.addAttribute("errorMessage", "Un utilisateur avec ce login ou cet email existe déjà.");
            return "authentication/registration";
        }

        // Vérifie format email
        if (!user.getEmail().matches("^[\\w-.]+@[\\w-]+\\.[a-zA-Z]{2,}$")) {
            model.addAttribute("errorMessage", "Format d'adresse email invalide.");
            return "authentication/registration";
        }

        // Vérifie format téléphone (si champ non vide)
        if (user.getTelephone() != null && !user.getTelephone().isBlank()) {
            // Doit commencer par 0, suivi de 8 ou 9 chiffres, donc total 9 ou 10 chiffres
            if (!user.getTelephone().matches("^0[0-9]{8,9}$")) {
                model.addAttribute("errorMessage", "Le numéro de téléphone doit commencer par 0 et contenir 9 ou 10 chiffres (sans espaces ni caractères spéciaux).");
                return "authentication/employeeSignup";
            }
        }

        // Encoder le mdp avant la sauvegarde
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        // Initialiser created_at avec la date et l'heure actuelles
        user.setCreated_at(LocalDateTime.now());
        // Définir le rôle par défaut
        user.setRole(UserRole.CLIENT);
        // Vous pouvez également définir d'autres valeurs par défaut (langue, etc.)
        if (user.getLangue() == null || user.getLangue().isEmpty()) {
            user.setLangue("fr"); // ou une autre valeur par défaut
        }
        // on force le typeClient à "entreprise" pour l'inscription d'un partenaire
        user.setTypeClient("entreprise");
        // Sauvegarder l'user
        userService.addUser(user);

        // Rediriger vers la page de login
        return "redirect:/partners?registrationSuccess=true";
    }


}
