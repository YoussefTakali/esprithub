package tn.esprithub.server.authentication.util;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.springframework.stereotype.Component;
import tn.esprithub.server.authentication.dto.AuthResponse;
import tn.esprithub.server.user.entity.User;

@Mapper(componentModel = "spring")
@Component
public interface AuthMapper {

    @Mapping(target = "hasGithubToken", expression = "java(user.getGithubToken() != null)")
    AuthResponse.UserDto toUserDto(User user);
}
