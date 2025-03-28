package be.stage.ticharmony.controller;

import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.service.ProblemService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequestMapping("/problems")
public class ProblemController {
    @Autowired
    private ProblemService service;

    public ProblemController(ProblemService service) {
        this.service = service;
    }

    /**
     * Affiche la liste des problèmes.
     * Correspond à la vue listProblems.html.
     */
    @GetMapping
    public String getAllProblems(Model model) {
        Iterable<Problem> problems = service.getProblems();
        model.addAttribute("problems", problems);
        model.addAttribute("module", "problems");
        return "listProblems"; // home.html se trouve dans src/main/resources/templates
    }

    /**
     * Affiche le formulaire de création d'un nouveau problème.
     * Correspond à la vue formCreateProblem.html.
     */
    @GetMapping("/create")
    public String showCreateForm(Model model) {
        model.addAttribute("problem", new Problem());
        return "formCreateProblem";
    }

    /**
     * Affiche le formulaire de mise à jour d'un problème existant.
     * Correspond à la vue formUpdateProblem.html.
     */
    @GetMapping("/update/{id}")
    public String showUpdateForm(@PathVariable Long id, Model model) {
        Problem problem = service.getProblem(id);
        if (problem == null) {
            // Si le problème n'existe pas, redirige vers la liste
            return "redirect:/problems";
        }
        model.addAttribute("problem", problem);
        return "formUpdateProblem";
    }

    /**
     * Traite la soumission du formulaire de création ou de mise à jour.
     * L'action des formulaires doit pointer vers /problems/save.
     */
    @PostMapping("/save")
    public String saveProblem(@ModelAttribute("problem") Problem problem) {
        if (problem.getId() != null) {
            service.updateProblem(problem);
        } else {
            service.createProblem(problem);
        }
        return "redirect:/problems";
    }

    /**
     * Supprime un problème et redirige vers la liste.
     */
    @GetMapping("/delete/{id}")
    public String deleteProblem(@PathVariable Long id) {
        service.deleteProblem(id);
        return "redirect:/problems";
    }
}


