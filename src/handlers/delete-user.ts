import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { GetCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamo } from '../lib/dynamodb';
import { unauthorized, ok, badRequest, notFound, internalError } from '../lib/response';
import { getAuth } from '../lib/auth';
import { withCors } from '../common/cors';

const USERS_TABLE = process.env.USERS_TABLE as string;

async function handler(
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> {
  try {
    const userId = event.pathParameters?.id;
    if (!userId) return notFound('Usuario no encontrado');

    const auth = getAuth(event);
    if (!auth) return unauthorized();
    const callerId = auth.userId;
    if (callerId !== userId) {
      return badRequest('Solo puedes borrar tu propio usuario');
    }

    const existing = await dynamo.send(
      new GetCommand({ TableName: USERS_TABLE, Key: { userId } })
    );
    if (!existing.Item) return notFound('Usuario no encontrado');

    await dynamo.send(
      new DeleteCommand({ TableName: USERS_TABLE, Key: { userId } })
    );

    return ok({ message: 'Usuario borrado exitosamente' });
  } catch (error) {
    console.error('Error en delete user', error);
    return internalError();
  }
}

export const deleteUser = withCors(handler);
