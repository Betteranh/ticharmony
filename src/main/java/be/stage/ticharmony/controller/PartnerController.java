package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.*;
import be.stage.ticharmony.service.MailService;
import be.stage.ticharmony.service.PartnerSheetService;
import be.stage.ticharmony.service.ProblemService;
import be.stage.ticharmony.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
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
    private final MailService mailService;
    private final PartnerSheetService sheetService;
    private final ProblemService problemService;

    @Autowired
    public PartnerController(UserService userService, BCryptPasswordEncoder passwordEncoder,
                             MailService mailService, PartnerSheetService sheetService,
                             ProblemService problemService) {
        this.userService = userService;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.sheetService = sheetService;
        this.problemService = problemService;
    }

    // ─── Detail page ────────────────────────────────────────────────────────

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'MEMBER')")
    public String partnerDetail(@PathVariable Long id, Model model, Authentication auth) {
        User partner = userService.getUser(id);
        if (partner == null || partner.getRole() != UserRole.CLIENT) {
            return "redirect:/partners";
        }
        User currentUser = userService.findByLogin(auth.getName());
        PartnerSheet sheet = sheetService.getOrCreateSheet(partner);
        List<Problem> tickets = (List<Problem>) problemService.getProblemsByUser(partner);

        model.addAttribute("partner", partner);
        model.addAttribute("sheet", sheet);
        model.addAttribute("tickets", tickets);
        model.addAttribute("currentUser", currentUser);
        model.addAttribute("module", "partners");
        return "partnerDetail";
    }

    // ─── Sheet: notes ───────────────────────────────────────────────────────

    @PostMapping("/{id}/sheet/notes")
    @PreAuthorize("hasRole('ADMIN')")
    public String saveNotes(@PathVariable Long id, @RequestParam(required = false) String notes) {
        User partner = userService.getUser(id);
        if (partner != null) {
            sheetService.saveNotes(sheetService.getOrCreateSheet(partner), notes);
        }
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    // ─── Sheet: sections ────────────────────────────────────────────────────

    @PostMapping("/{id}/sheet/sections")
    @PreAuthorize("hasRole('ADMIN')")
    public String addSection(@PathVariable Long id,
                             @RequestParam(required = false) String icon,
                             @RequestParam String title) {
        User partner = userService.getUser(id);
        if (partner != null && title != null && !title.isBlank()) {
            sheetService.addSection(sheetService.getOrCreateSheet(partner), icon, title);
        }
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    @PostMapping("/{id}/sheet/sections/{sectionId}/edit")
    @PreAuthorize("hasRole('ADMIN')")
    public String editSection(@PathVariable Long id, @PathVariable Long sectionId,
                              @RequestParam(required = false) String icon,
                              @RequestParam String title) {
        sheetService.findSection(sectionId).ifPresent(s -> sheetService.updateSection(s, icon, title));
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    @PostMapping("/{id}/sheet/sections/{sectionId}/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public String deleteSection(@PathVariable Long id, @PathVariable Long sectionId) {
        sheetService.findSection(sectionId).ifPresent(sheetService::deleteSection);
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    // ─── Sheet: entries ─────────────────────────────────────────────────────

    @PostMapping("/{id}/sheet/sections/{sectionId}/entries")
    @PreAuthorize("hasRole('ADMIN')")
    public String addEntry(@PathVariable Long id, @PathVariable Long sectionId,
                           @RequestParam String label,
                           @RequestParam(required = false) String value,
                           @RequestParam(defaultValue = "false") boolean password) {
        sheetService.findSection(sectionId).ifPresent(s -> sheetService.addEntry(s, label, value, password));
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    @PostMapping("/{id}/sheet/entries/{entryId}/edit")
    @PreAuthorize("hasRole('ADMIN')")
    public String editEntry(@PathVariable Long id, @PathVariable Long entryId,
                            @RequestParam String label,
                            @RequestParam(required = false) String value,
                            @RequestParam(defaultValue = "false") boolean password) {
        sheetService.findEntry(entryId).ifPresent(e -> sheetService.updateEntry(e, label, value, password));
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    @PostMapping("/{id}/sheet/entries/{entryId}/delete")
    @PreAuthorize("hasRole('ADMIN')")
    public String deleteEntry(@PathVariable Long id, @PathVariable Long entryId) {
        sheetService.findEntry(entryId).ifPresent(sheetService::deleteEntry);
        return "redirect:/partners/" + id + "?tab=fiche";
    }

    // ─── List ────────────────────────────────────────────────────────────────

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
    public String editPartnerForm(@PathVariable Long id, Model model,
                                  @RequestParam(defaultValue = "false") boolean credentialsSent) {
        User partner = userService.getUser(id);
        if (partner == null) {
            return "redirect:/partners";
        }
        model.addAttribute("user", partner);
        model.addAttribute("credentialsSent", credentialsSent);
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

        if (updatedUser.getProfileManagementPassword() != null && !updatedUser.getProfileManagementPassword().isBlank()) {
            existing.setProfileManagementPassword(passwordEncoder.encode(updatedUser.getProfileManagementPassword()));
        }

        userService.updateUser(existing);
        return "redirect:/partners";
    }

    @PostMapping("/{id}/send-credentials")
    public String sendCredentials(@PathVariable Long id,
                                  @RequestParam(required = false) String newPassword,
                                  @RequestParam(required = false) String newProfilePassword) {
        User user = userService.getUser(id);
        if (user == null) return "redirect:/partners";

        if (newPassword != null && !newPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(newPassword));
        }
        if (newProfilePassword != null && !newProfilePassword.isBlank()) {
            user.setProfileManagementPassword(passwordEncoder.encode(newProfilePassword));
        }
        userService.updateUser(user);

        mailService.sendWelcomeCredentialsEmail(user, newPassword, newProfilePassword);

        return "redirect:/partners/edit/" + id + "?credentialsSent=true";
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