package be.stage.ticharmony.rest;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/registration")
public class RegistrationRestController {
    private final UserService userService;
    private final BCryptPasswordEncoder passwordEncoder;

    @Autowired
    public RegistrationRestController(UserService userService, BCryptPasswordEncoder passwordEncoder) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
    }

    // Si besoin, expose une route GET pour le front (ex: récupérer une structure User vierge)
    @GetMapping
    public User emptyUser() {
        return new User();
    }

    // La route d'inscription REST
    @PostMapping
    public ResponseEntity<?> registerUser(@RequestBody User user) {
        boolean userExists = userService.getAllUsers().stream()
                .anyMatch(u -> u.getLogin().equalsIgnoreCase(user.getLogin())
                        || u.getEmail().equalsIgnoreCase(user.getEmail()));

        if (userExists) {
            // Retourne un message d’erreur + code HTTP 400
            return ResponseEntity
                    .badRequest()
                    .body("Un utilisateur avec ce login ou cet email existe déjà.");
        }

        user.setPassword(passwordEncoder.encode(user.getPassword()));
        user.setCreated_at(LocalDateTime.now());
        user.setRole(UserRole.CLIENT);
        if (user.getLangue() == null || user.getLangue().isEmpty()) {
            user.setLangue("fr");
        }
        user.setTypeClient("entreprise");
        userService.addUser(user);

        // Retourne un message de succès
        return ResponseEntity.ok("Inscription réussie");
    }
}
