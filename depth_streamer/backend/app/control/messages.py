from typing import Union, Literal
from dataclasses import dataclass


ControlCommand = Union[
    'SetRangeCommand',
    'SetConfidenceCommand',
    'SetColormapCommand',
    'SetFpsLimitCommand'
]


@dataclass
class SetRangeCommand:
    max_distance: int  # 2000 or 4000


@dataclass
class SetConfidenceCommand:
    threshold: int  # 0-255


@dataclass
class SetColormapCommand:
    colormap: str  # RAINBOW, JET, TURBO, etc.


@dataclass
class SetFpsLimitCommand:
    fps: int  # 5-30


@dataclass
class ControlMessage:
    type: Literal[
        'set_range',
        'set_confidence_threshold',
        'set_colormap',
        'set_fps_limit'
    ]
    payload: dict

    @classmethod
    def from_dict(cls, data: dict) -> 'ControlMessage':
        return cls(
            type=data['type'],
            payload=data['payload']
        )

    def to_command(self) -> ControlCommand:
        if self.type == 'set_range':
            return SetRangeCommand(max_distance=self.payload['max_distance'])
        elif self.type == 'set_confidence_threshold':
            return SetConfidenceCommand(threshold=self.payload['threshold'])
        elif self.type == 'set_colormap':
            return SetColormapCommand(colormap=self.payload['colormap'])
        elif self.type == 'set_fps_limit':
            return SetFpsLimitCommand(fps=self.payload['fps'])
        else:
            raise ValueError(f"Unknown command type: {self.type}")


@dataclass
class ControlResponse:
    type: Literal['ack', 'error']
    command_type: str
    message: str

    def to_dict(self) -> dict:
        return {
            'type': self.type,
            'command_type': self.command_type,
            'message': self.message
        }
