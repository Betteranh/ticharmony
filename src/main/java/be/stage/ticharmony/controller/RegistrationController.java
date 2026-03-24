package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.MailService;
import be.stage.ticharmony.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Controller
@RequestMapping("/registration")
public class RegistrationController {

    private final UserService userService;
    private final BCryptPasswordEncoder passwordEncoder;
    private final MailService mailService;

    @Autowired
    public RegistrationController(UserService userService, BCryptPasswordEncoder passwordEncoder, MailService mailService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    @GetMapping
    public String showRegistrationForm(Model model) {
        model.addAttribute("user", new User());
        return "authentication/registration";
    }

    @PostMapping
    public String registerUser(@Valid @ModelAttribute("user") User user, BindingResult bindingResult, Model model,
                               @RequestParam(defaultValue = "false") boolean sendCredentials) {
        if (bindingResult.hasErrors()) {
            return "authentication/registration";
        }

        boolean userExists = userService.getAllUsers().stream()
                .anyMatch(u -> u.getLogin().equalsIgnoreCase(user.getLogin())
                        || u.getEmail().equalsIgnoreCase(user.getEmail()));
        if (userExists) {
            model.addAttribute("errorMessage", "Un utilisateur avec ce login ou cet email existe déjà.");
            return "authentication/registration";
        }

        if (!user.getEmail().matches("^[\\w-.]+@[\\w-]+\\.[a-zA-Z]{2,}$")) {
            model.addAttribute("errorMessage", "Format d'adresse email invalide.");
            return "authentication/registration";
        }

        if (user.getTelephone() != null && !user.getTelephone().isBlank()) {
            if (!user.getTelephone().matches("^0[0-9]{8,9}$")) {
                model.addAttribute("errorMessage", "Le numéro de téléphone doit commencer par 0 et contenir 9 ou 10 chiffres (sans espaces ni caractères spéciaux).");
                return "authentication/registration";
            }
        }

        String rawPassword = user.getPassword();
        String rawProfilePassword = user.getProfileManagementPassword();

        user.setPassword(passwordEncoder.encode(rawPassword));
        if (rawProfilePassword != null && !rawProfilePassword.isBlank()) {
            user.setProfileManagementPassword(passwordEncoder.encode(rawProfilePassword));
        }
        user.setCreated_at(LocalDateTime.now());
        user.setActiveFrom(LocalDate.now());
        user.setRole(UserRole.CLIENT);
        user.setTypeClient("entreprise");

        if (user.getLangue() == null || user.getLangue().isEmpty()) {
            user.setLangue("fr");
        }

        userService.addUser(user);

        if (sendCredentials) {
            mailService.sendWelcomeCredentialsEmail(user, rawPassword, rawProfilePassword);
        }

        return "redirect:/partners?registrationSuccess=true";
    }
}