export function respData(data: any) {
  return respJson(0, "ok", data || []);
}

export function respOk() {
  return respJson(0, "ok");
}

export function respErr(message: string, status?: number) {
  return respJson(-1, message, undefined, status);
}

/**
 * 统一错误响应（支持详细错误信息）
 */
export function respError(error: string, code?: number, details?: any) {
  const statusCode = code || 500;
  return Response.json(
    {
      code: -1,
      message: error,
      ...(details && { details })
    },
    { status: statusCode }
  );
}

export function respJson(code: number, message: string, data?: any, status?: number) {
  let json = {
    code: code,
    message: message,
    data: data,
  };
  if (data) {
    json["data"] = data;
  }

  return Response.json(json, { status: status || 200 });
}
