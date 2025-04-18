package be.stage.ticharmony.repository;

import be.stage.ticharmony.model.User;
import be.stage.ticharmony.model.UserRole;
import org.springframework.data.repository.CrudRepository;

import java.util.List;

public interface UserRepository extends CrudRepository<User, Long> {
    User findByLogin(String login);

    List<User> findByLastname(String lastname);

    User findById(long id);

    List<User> findByRole(UserRole role);

}
