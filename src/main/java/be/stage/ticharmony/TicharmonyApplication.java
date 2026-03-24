package be.stage.ticharmony;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;

@SpringBootApplication
@EnableAsync
public class TicharmonyApplication {

    public static void main(String[] args) {
        SpringApplication.run(TicharmonyApplication.class, args);
    }

}
