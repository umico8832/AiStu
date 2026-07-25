"""轻量 JSON Schema 校验器（标准库实现）。

支持本项目 Schema 用到的子集：type / enum / const / required / properties /
additionalProperties / items / minItems / minLength / minimum / pattern。
"""
from __future__ import annotations

import re
from typing import Any, Dict, List

_TYPE_MAP = {
    "object": dict,
    "array": list,
    "string": str,
    "integer": int,
    "number": (int, float),
    "boolean": bool,
    "null": type(None),
}


def _type_ok(value: Any, expected: Any) -> bool:
    types = expected if isinstance(expected, list) else [expected]
    for t in types:
        py = _TYPE_MAP.get(t)
        if py is None:
            continue
        if t == "integer" and isinstance(value, bool):
            continue
        if isinstance(value, py):  # type: ignore[arg-type]
            return True
    return False


def validate_schema(instance: Any, schema: Dict[str, Any], path: str = "$") -> List[str]:
    """返回错误列表；空列表表示通过。"""
    errors: List[str] = []

    if "const" in schema and instance != schema["const"]:
        errors.append(f"{path}: 应为常量 {schema['const']!r}，实际 {instance!r}")
    if "enum" in schema and instance not in schema["enum"]:
        errors.append(f"{path}: 值 {instance!r} 不在枚举 {schema['enum']} 中")
    if "type" in schema and not _type_ok(instance, schema["type"]):
        errors.append(f"{path}: 类型应为 {schema['type']}，实际 {type(instance).__name__}")
        return errors  # 类型不符时后续检查无意义

    if isinstance(instance, str):
        if "minLength" in schema and len(instance) < schema["minLength"]:
            errors.append(f"{path}: 长度 {len(instance)} < minLength {schema['minLength']}")
        if "pattern" in schema and not re.search(schema["pattern"], instance):
            errors.append(f"{path}: 不匹配 pattern {schema['pattern']!r}")

    if isinstance(instance, (int, float)) and not isinstance(instance, bool):
        if "minimum" in schema and instance < schema["minimum"]:
            errors.append(f"{path}: 值 {instance} < minimum {schema['minimum']}")

    if isinstance(instance, list):
        if "minItems" in schema and len(instance) < schema["minItems"]:
            errors.append(f"{path}: 元素数 {len(instance)} < minItems {schema['minItems']}")
        if "items" in schema:
            for i, item in enumerate(instance):
                errors.extend(validate_schema(item, schema["items"], f"{path}[{i}]"))

    if isinstance(instance, dict):
        for key in schema.get("required", []):
            if key not in instance:
                errors.append(f"{path}: 缺少必填字段 {key!r}")
        props = schema.get("properties", {})
        for key, sub in props.items():
            if key in instance:
                errors.extend(validate_schema(instance[key], sub, f"{path}.{key}"))
        if schema.get("additionalProperties") is False:
            extra = set(instance) - set(props)
            if extra:
                errors.append(f"{path}: 存在未定义字段 {sorted(extra)}")

    return errors
