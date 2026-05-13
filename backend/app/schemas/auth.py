from pydantic import BaseModel, EmailStr, Field, field_validator


class RegisterRequest(BaseModel):
    email: EmailStr
    username: str = Field(min_length=1, max_length=50)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("username")
    @classmethod
    def username_not_blank(cls, v: str) -> str:
        stripped: str = v.strip()
        if stripped == "":
            raise ValueError("El nombre de usuario no puede estar vacío")
        return stripped


class RegisterResponse(BaseModel):
    user_id: str
    email: str
    username: str
    access_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class LoginResponse(BaseModel):
    user_id: str
    email: str
    username: str
    access_token: str


class RefreshResponse(BaseModel):
    access_token: str
    user_id: str
    email: str
    username: str
