const mysql = require('mysql2/promise');
const { v4: uuidv4 } = require('uuid');

const getDbConnection = async () => {
  return mysql.createConnection({
    host: process.env.DATABASE_HOST,
    port: parseInt(process.env.DATABASE_PORT, 10),
    user: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: process.env.DATABASE_NAME,
  });
};

const closeDbConnection = async (connection) => {
  if (connection) {
    await connection.end();
  }
};

exports.handler = async (event) => {
  let connection;
  try {
    connection = await getDbConnection();
    let response = {};
    const { numeroCuenta, monto, tarjetaDebito, claveActual, nuevaClave } = JSON.parse(event.body);

    const generateTransactionId = async () => {
      const idTransaccion = uuidv4();
      await connection.execute(
        'INSERT INTO Transaccion (tipo, monto, idCuenta) VALUES (?, ?, ?)',
        ['Deposito', monto, numeroCuenta]
      );
      return idTransaccion;
    };

    switch (event.path) {
      case '/depositar':
        try {
          const [rows] = await connection.execute(
            'UPDATE CuentaBancaria SET saldo = saldo + ? WHERE numeroCuenta = ?',
            [monto, numeroCuenta]
          );

          if (rows.affectedRows > 0) {
            const idTransaccion = await generateTransactionId();
            response = {
              statusCode: 200,
              body: JSON.stringify({ mensaje: 'Depósito exitoso', idTransaccion }),
            };
          } else {
            response = {
              statusCode: 404,
              body: JSON.stringify({ mensaje: 'Número de cuenta no encontrado' }),
            };
          }
        } catch (error) {
          response = {
            statusCode: 500,
            body: JSON.stringify({ mensaje: 'Error al realizar el depósito', error: error.message }),
          };
        }
        break;
      case '/retirar':
        try {
          const [rows] = await connection.execute(
            'SELECT saldo FROM CuentaBancaria WHERE numeroCuenta = ?',
            [numeroCuenta]
          );

          if (rows.length > 0) {
            const saldoActual = rows[0].saldo;
            if (saldoActual >= monto) {
              await connection.execute(
                'UPDATE CuentaBancaria SET saldo = saldo - ? WHERE numeroCuenta = ?',
                [monto, numeroCuenta]
              );
              const idTransaccion = await generateTransactionId();
              response = {
                statusCode: 200,
                body: JSON.stringify({ mensaje: 'Retiro exitoso', idTransaccion }),
              };
            } else {
              response = {
                statusCode: 400,
                body: JSON.stringify({ mensaje: 'Saldo insuficiente' }),
              };
            }
          } else {
            response = {
              statusCode: 404,
              body: JSON.stringify({ mensaje: 'Número de cuenta no encontrado' }),
            };
          }
        } catch (error) {
          response = {
            statusCode: 500,
            body: JSON.stringify({ mensaje: 'Error al realizar el retiro', error: error.message }),
          };
        }
        break;
      case '/cambiar_clave':
        try {
          const [rows] = await connection.execute(
            'SELECT * FROM CuentaBancaria WHERE tarjetaDebito = ? AND claveTarjeta = ?',
            [tarjetaDebito, claveActual]
          );

          if (rows.length > 0) {
            await connection.execute(
              'UPDATE CuentaBancaria SET claveTarjeta = ? WHERE tarjetaDebito = ?',
              [nuevaClave, tarjetaDebito]
            );
            response = {
              statusCode: 200,
              body: JSON.stringify({ mensaje: 'Clave cambiada exitosamente' }),
            };
          } else {
            response = {
              statusCode: 400,
              body: JSON.stringify({ mensaje: 'Tarjeta o clave actual incorrecta' }),
            };
          }
        } catch (error) {
          response = {
            statusCode: 500,
            body: JSON.stringify({ mensaje: 'Error al cambiar la clave', error: error.message }),
          };
        }
        break;
      default:
        response = {
          statusCode: 404,
          body: JSON.stringify({ mensaje: 'Ruta no encontrada' }),
        };
    }
    return response;
  } catch (error) {
    console.error(error);
    return {
      statusCode: 500,
      body: JSON.stringify({ mensaje: 'Error al procesar la solicitud', error: error.message }),
    };
  } finally {
    await closeDbConnection(connection);
  }
};
