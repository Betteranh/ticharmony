package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.UserService;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@Controller
@RequestMapping("/employees")
@PreAuthorize("hasRole('ADMIN')")
public class EmployeeController {
    @Autowired
    private UserService userService;

    @GetMapping
    public String listEmployees(Model model) {
        List<User> employees = userService.getAllUsers().stream()
                .filter(u -> u.getRole() == UserRole.ADMIN || u.getRole() == UserRole.MEMBER)
                .collect(Collectors.toList());
        model.addAttribute("employees", employees);
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
    public String editEmployeeForm(@PathVariable Long id, Model model) {
        User employee = userService.getUser(id);
        if (employee == null) {
            return "redirect:/employees";
        }
        model.addAttribute("user", employee);
        return "formEditEmployee";
    }

    @PostMapping("/edit/{id}")
    public String updateEmployee(@PathVariable Long id, @ModelAttribute("user") User updatedUser) {
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
        // MàJ du login (optionnel, souvent readonly)
        // existing.setLogin(updatedUser.getLogin());
        // Si le mot de passe a été rempli, on l’update :
        if (updatedUser.getPassword() != null && !updatedUser.getPassword().isBlank()) {
            existing.setPassword(updatedUser.getPassword());
        }
        userService.updateUser(existing);
        return "redirect:/employees";
    }

    @PostMapping("/delete/{id}")
    public String deleteEmployee(@PathVariable Long id) {
        userService.deleteUser(id); // Ajoute cette méthode dans ton UserService si besoin
        return "redirect:/employees";
    }
}
