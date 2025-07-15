package be.stage.ticharmony.controller;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

@Controller
public class LoginController {
    @GetMapping("/login")
    public String login(
            @RequestParam(required = false) final Boolean loginRequired,
            @RequestParam(required = false) final Boolean loginError,
            @RequestParam(required = false) final Boolean logoutSuccess,
            final Model model,
            HttpServletRequest request,
            RedirectAttributes redirectAttributes) {

        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        // Si l'utilisateur est déjà connecté...
        if (auth != null && auth.isAuthenticated() && !"anonymousUser".equals(auth.getPrincipal())) {
            redirectAttributes.addFlashAttribute("alreadyLoggedIn", true);

            // Revenir à la page précédente (ou accueil si null)
            String referer = request.getHeader("Referer");
            return "redirect:" + (referer != null ? referer : "/");
        }

        if (loginRequired == Boolean.TRUE) {
            model.addAttribute("errorMessage", "Vous devez vous connecter pour avoir accès.");
        }

        if (loginError == Boolean.TRUE) {
            model.addAttribute("errorMessage", "Échec de la connexion !");
        }

        if (logoutSuccess == Boolean.TRUE) {
            model.addAttribute("successMessage", "Vous êtes déconnecté avec succès.");
        }

        return "authentication/login";
    }

}
