package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.UserProfileService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@Controller
@PreAuthorize("hasRole('CLIENT')")
public class ProfileController {

    public static final String SESSION_PROFILE_KEY = "ACTIVE_PROFILE_ID";

    // Couleurs disponibles pour les avatars
    private static final List<String> AVAILABLE_COLORS = List.of(
            "#3b82f6", "#10b981", "#8b5cf6", "#f59e0b",
            "#ef4444", "#06b6d4", "#ec4899", "#64748b"
    );

    @Autowired
    private UserProfileService profileService;

    @Autowired
    private UserRepository userRepository;

    // ─── Sélection de profil ───────────────────────────────────────────

    @GetMapping("/select-profile")
    public String showSelectProfile(Model model, Principal principal, HttpSession session) {
        User user = userRepository.findByLogin(principal.getName());
        List<UserProfile> profiles = profileService.getActiveProfiles(user);
        List<UserProfile> allProfiles = profileService.getAllProfiles(user);

        model.addAttribute("profiles", profiles);
        model.addAttribute("allProfiles", allProfiles);
        model.addAttribute("availableColors", AVAILABLE_COLORS);
        model.addAttribute("companyName", user.getNomEntreprise());
        return "profile/selectProfile";
    }

    @PostMapping("/select-profile/{id}")
    public String selectProfile(@PathVariable Long id, HttpSession session, Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        Optional<UserProfile> profile = profileService.findById(id);

        // Vérification : le profil appartient bien à ce compte entreprise
        if (profile.isEmpty() || !profile.get().getUser().getId().equals(user.getId())
                || !profile.get().isActive()) {
            return "redirect:/select-profile";
        }

        session.setAttribute(SESSION_PROFILE_KEY, id);
        return "redirect:/clientDashboard";
    }

    @GetMapping("/switch-profile")
    public String switchProfile(HttpSession session) {
        session.removeAttribute(SESSION_PROFILE_KEY);
        return "redirect:/select-profile";
    }

    // ─── Gestion des profils (créer / désactiver / réactiver) ──────────

    @PostMapping("/profiles/create")
    public String createProfile(@RequestParam String displayName,
                                @RequestParam String color,
                                Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        String safeName = displayName.trim().isEmpty() ? "Employé" : displayName.trim();
        String safeColor = AVAILABLE_COLORS.contains(color) ? color : AVAILABLE_COLORS.get(0);
        profileService.create(user, safeName, safeColor);
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/edit")
    public String editProfile(@PathVariable Long id,
                              @RequestParam String displayName,
                              @RequestParam String color,
                              Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (p.getUser().getId().equals(user.getId())) {
                String safeName = displayName.trim().isEmpty() ? p.getDisplayName() : displayName.trim();
                String safeColor = AVAILABLE_COLORS.contains(color) ? color : p.getColor();
                p.setDisplayName(safeName);
                p.setColor(safeColor);
                profileService.save(p);
            }
        });
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/deactivate")
    public String deactivateProfile(@PathVariable Long id,
                                    HttpSession session,
                                    Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (p.getUser().getId().equals(user.getId())) {
                profileService.deactivate(id);
                // Si c'était le profil actif, on force la re-sélection
                Long active = (Long) session.getAttribute(SESSION_PROFILE_KEY);
                if (id.equals(active)) {
                    session.removeAttribute(SESSION_PROFILE_KEY);
                }
            }
        });
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/reactivate")
    public String reactivateProfile(@PathVariable Long id, Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (p.getUser().getId().equals(user.getId())) {
                profileService.reactivate(id);
            }
        });
        return "redirect:/select-profile";
    }
}