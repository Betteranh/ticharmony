package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.MailService;
import be.stage.ticharmony.service.UserService;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/employees")
@PreAuthorize("hasRole('ADMIN')")
public class EmployeeController {
    @Autowired
    private UserService userService;
    @Autowired
    private BCryptPasswordEncoder passwordEncoder;
    @Autowired
    private MailService mailService;

    @GetMapping
    public String listEmployees(Model model) {
        List<User> employees = userService.getAllUsers().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN || u.getRole() == UserRole.MEMBER)
                .collect(Collectors.toList());
        long activeCount = employees.stream().filter(User::isActive).count();
        model.addAttribute("employees", employees);
        model.addAttribute("activeCount", activeCount);
        return "listEmployees";
    }

    @PostMapping("/changeRole")
    public String changeRole(@RequestParam Long userId, @RequestParam UserRole newRole) {
        User user = userService.getUser(userId);
        if (user != null) {
            user.setRole(newRole);
            userService.updateUser(user);
        }
        return "redirect:/employees";
    }

    @GetMapping("/edit/{id}")
    public String editEmployeeForm(@PathVariable Long id, Model model,
                                   @RequestParam(defaultValue = "false") boolean credentialsSent) {
        User employee = userService.getUser(id);
        if (employee == null) {
            return "redirect:/employees";
        }
        model.addAttribute("user", employee);
        model.addAttribute("credentialsSent", credentialsSent);
        return "formEditEmployee";
    }

    @PostMapping("/{id}/send-credentials")
    public String sendCredentials(@PathVariable Long id,
                                  @RequestParam(required = false) String newPassword) {
        User user = userService.getUser(id);
        if (user == null) return "redirect:/employees";

        if (newPassword != null && !newPassword.isBlank()) {
            user.setPassword(passwordEncoder.encode(newPassword));
            userService.updateUser(user);
        }

        mailService.sendWelcomeCredentialsEmail(user, newPassword, null);
        return "redirect:/employees/edit/" + id + "?credentialsSent=true";
    }

    @PostMapping("/edit/{id}")
    public String updateEmployee(@PathVariable Long id, @ModelAttribute("user") User updatedUser, Model model) {
        User existing = userService.getUser(id);
        if (existing == null) {
            return "redirect:/employees";
        }

        // MàJ des champs autorisés
        existing.setFirstname(updatedUser.getFirstname());
        existing.setLastname(updatedUser.getLastname());
        existing.setEmail(updatedUser.getEmail());
        existing.setTelephone(updatedUser.getTelephone());
        existing.setAdresse(updatedUser.getAdresse());
        existing.setActiveFrom(updatedUser.getActiveFrom());
        existing.setActiveTo(updatedUser.getActiveTo());
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isBlank()) {
            existing.setPassword(passwordEncoder.encode(updatedUser.getPassword()));
        }
        userService.updateUser(existing);
        return "redirect:/employees";
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
        return "redirect:/employees";
    }

    @PostMapping("/delete/{id}")
    public String deleteEmployee(@PathVariable Long id) {
        userService.deleteUser(id);
        return "redirect:/employees";
    }
}
