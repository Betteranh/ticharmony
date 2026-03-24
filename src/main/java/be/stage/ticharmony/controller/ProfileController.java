package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserProfile;
import be.stage.ticharmony.repository.UserRepository;
import be.stage.ticharmony.service.UserProfileService;
import jakarta.servlet.http.HttpSession;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

@Controller
@PreAuthorize("hasRole('CLIENT')")
public class ProfileController {

    public static final String SESSION_PROFILE_KEY    = "ACTIVE_PROFILE_ID";
    public static final String SESSION_MANAGEMENT_KEY = "MANAGEMENT_UNLOCKED";

    @Autowired
    private BCryptPasswordEncoder passwordEncoder;

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
    public String showSelectProfile(Model model, Principal principal, HttpSession session,
                                    @RequestParam(required = false) Long lock,
                                    @RequestParam(required = false) String pwError,
                                    @RequestParam(required = false) String manageError,
                                    @RequestParam(required = false) String openManage,
                                    @RequestParam(required = false) String setup) {
        User user = userRepository.findByLogin(principal.getName());
        List<UserProfile> profiles = profileService.getActiveProfiles(user);
        List<UserProfile> allProfiles = profileService.getAllProfiles(user);

        // Si le compte n'a pas de mot de passe de gestion configuré, l'accès est toujours libre
        String mgmtHash = user.getProfileManagementPassword();
        if (mgmtHash == null || mgmtHash.isBlank()) {
            session.setAttribute(SESSION_MANAGEMENT_KEY, true);
        }
        boolean managementUnlocked = session.getAttribute(SESSION_MANAGEMENT_KEY) != null;

        model.addAttribute("profiles", profiles);
        model.addAttribute("allProfiles", allProfiles);
        model.addAttribute("noProfiles", allProfiles.isEmpty());
        model.addAttribute("availableColors", AVAILABLE_COLORS);
        model.addAttribute("companyName", user.getNomEntreprise());
        model.addAttribute("lockProfileId", lock);
        model.addAttribute("passwordError", "1".equals(pwError));
        model.addAttribute("managementUnlocked", managementUnlocked);
        model.addAttribute("managementError", "1".equals(manageError));
        model.addAttribute("openManage", "1".equals(openManage));
        model.addAttribute("setupMode", lock != null && "1".equals(setup));
        model.addAttribute("hideNotifications", true);
        return "profile/selectProfile";
    }

    @PostMapping("/select-profile/{id}")
    public String selectProfile(@PathVariable Long id,
                                @RequestParam(required = false) String password,
                                HttpSession session, Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        Optional<UserProfile> opt = profileService.findById(id);

        if (opt.isEmpty() || !opt.get().getUser().getId().equals(user.getId())
                || !opt.get().isActive()) {
            return "redirect:/select-profile";
        }

        UserProfile profile = opt.get();
        if (!profileService.hasPassword(profile)) {
            // Profil sans mot de passe : l'employé doit en créer un
            if (password == null || password.isBlank() || password.length() < 4) {
                return "redirect:/select-profile?lock=" + id + "&setup=1";
            }
            profileService.setPassword(id, password);
            session.setAttribute(SESSION_PROFILE_KEY, id);
            return "redirect:/clientDashboard";
        }

        if (!profileService.verifyPassword(profile, password)) {
            String errorParam = (password != null && !password.isBlank()) ? "&pwError=1" : "";
            return "redirect:/select-profile?lock=" + id + errorParam;
        }

        session.setAttribute(SESSION_PROFILE_KEY, id);
        return "redirect:/clientDashboard";
    }

    @GetMapping("/switch-profile")
    public String switchProfile(HttpSession session) {
        session.removeAttribute(SESSION_PROFILE_KEY);
        return "redirect:/select-profile";
    }

    // ─── Déverrouillage de la gestion des profils ─────────────────────

    @PostMapping("/profiles/unlock-management")
    public String unlockManagement(@RequestParam(required = false) String managementPassword,
                                   HttpSession session, Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        String hash = user.getProfileManagementPassword();
        // Pas de mot de passe configuré → accès libre
        if (hash == null || hash.isBlank()) {
            session.setAttribute(SESSION_MANAGEMENT_KEY, true);
            return "redirect:/select-profile";
        }
        // Vérifier le mot de passe saisi
        boolean matches = managementPassword != null && !managementPassword.isBlank()
                && passwordEncoder.matches(managementPassword, hash);
        if (matches) {
            session.setAttribute(SESSION_MANAGEMENT_KEY, true);
            return "redirect:/select-profile?openManage=1";
        }
        return "redirect:/select-profile?manageError=1";
    }

    // ─── Gestion des profils (créer / désactiver / réactiver) ──────────

    @PostMapping("/profiles/create")
    public String createProfile(@RequestParam String displayName,
                                @RequestParam String color,
                                HttpSession session, Principal principal) {
        User user = userRepository.findByLogin(principal.getName());
        boolean hasProfiles = !profileService.getAllProfiles(user).isEmpty();
        // Premier profil : pas besoin du mot de passe de gestion
        if (hasProfiles && session.getAttribute(SESSION_MANAGEMENT_KEY) == null) return "redirect:/select-profile";
        String safeName = displayName.trim().isEmpty() ? "Employé" : displayName.trim();
        String safeColor = AVAILABLE_COLORS.contains(color) ? color : AVAILABLE_COLORS.get(0);
        profileService.create(user, safeName, safeColor);
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/edit")
    public String editProfile(@PathVariable Long id,
                              @RequestParam String displayName,
                              @RequestParam String color,
                              HttpSession session, Principal principal) {
        if (session.getAttribute(SESSION_MANAGEMENT_KEY) == null) return "redirect:/select-profile";
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
        if (session.getAttribute(SESSION_MANAGEMENT_KEY) == null) return "redirect:/select-profile";
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (p.getUser().getId().equals(user.getId())) {
                profileService.deactivate(id);
                Long active = (Long) session.getAttribute(SESSION_PROFILE_KEY);
                if (id.equals(active)) {
                    session.removeAttribute(SESSION_PROFILE_KEY);
                }
            }
        });
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/reactivate")
    public String reactivateProfile(@PathVariable Long id, HttpSession session, Principal principal) {
        if (session.getAttribute(SESSION_MANAGEMENT_KEY) == null) return "redirect:/select-profile";
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (p.getUser().getId().equals(user.getId())) {
                profileService.reactivate(id);
            }
        });
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/set-password")
    public String setPassword(@PathVariable Long id,
                              @RequestParam String password,
                              HttpSession session, Principal principal) {
        if (session.getAttribute(SESSION_MANAGEMENT_KEY) == null) return "redirect:/select-profile";
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (!p.getUser().getId().equals(user.getId())) return;
            if (password == null || password.length() < 4) return;
            profileService.setPassword(id, password);
        });
        return "redirect:/select-profile";
    }

    @PostMapping("/profiles/{id}/remove-password")
    public String removePassword(@PathVariable Long id, HttpSession session, Principal principal) {
        if (session.getAttribute(SESSION_MANAGEMENT_KEY) == null) return "redirect:/select-profile";
        User user = userRepository.findByLogin(principal.getName());
        profileService.findById(id).ifPresent(p -> {
            if (!p.getUser().getId().equals(user.getId())) return;
            profileService.removePassword(id);
        });
        return "redirect:/select-profile";
    }
}