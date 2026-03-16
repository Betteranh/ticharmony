package be.stage.ticharmony.controller;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class Windows10InfoController {
    @GetMapping("/infos-windows10")
    public String infosWindows10() {
        return "infos-windows10";
    }
}
