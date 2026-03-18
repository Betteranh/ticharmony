package be.stage.ticharmony.service;

import be.stage.ticharmony.model.Comment;
import be.stage.ticharmony.model.Problem;
import be.stage.ticharmony.model.User;
import be.stage.ticharmony.repository.CommentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CommentService {
    @Autowired
    private CommentRepository commentRepository;

    public List<Comment> getCommentsByProblem(Problem problem) {
        return commentRepository.findByProblemOrderByCreatedAtAsc(problem);
    }

    public List<Comment> getCommentsByProblemAfter(Problem problem, Long lastId) {
        return commentRepository.findByProblemAndIdGreaterThanOrderByCreatedAtAsc(problem, lastId);
    }

    public Comment addComment(Problem problem, User author, String content) {
        Comment comment = new Comment();
        comment.setProblem(problem);
        comment.setAuthor(author);
        comment.setContent(content);
        comment.setCreatedAt(LocalDateTime.now());
        return commentRepository.save(comment);
    }
}
