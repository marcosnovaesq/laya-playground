"""Request/response models mirroring the TypeSafe Jev `/v1/systemone` contract
(https://docs.typesafe.ai/api.md), so a client can point at either API
interchangeably by swapping only the base URL.
"""
from typing import Annotated, Any, Dict, List, Literal, Optional, Union

from pydantic import BaseModel, Field

State = Union[str, Dict[str, Any], List[Any]]
Instructions = Union[str, Dict[str, Any], List[Any]]


class NoulCriteria(BaseModel):
    true: Optional[str] = None
    false: Optional[str] = None


class NoulQuestion(BaseModel):
    type: Literal["noul"]
    instructions: Instructions
    criteria: Optional[NoulCriteria] = None


class ChoiceQuestion(BaseModel):
    type: Literal["choice"]
    instructions: Instructions
    criteria: Dict[str, Optional[str]]


class ScoreQuestion(BaseModel):
    type: Literal["score"]
    instructions: Instructions
    criteria: List[str]


Question = Annotated[
    Union[ChoiceQuestion, ScoreQuestion, NoulQuestion],
    Field(discriminator="type"),
]


class SystemOneRequest(BaseModel):
    state: State
    model: str = "laya-latest"
    questions: Dict[str, Question]
