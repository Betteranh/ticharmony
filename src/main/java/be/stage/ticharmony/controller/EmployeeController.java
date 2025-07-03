package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import be.stage.ticharmony.service.UserService;
import org.springframework.ui.Model;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

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
}
