const express = require('express');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid'); 

// Crea la aplicación Express
const app = express();

// Configurar la conexión a la base de datos MySQL
const db = mysql.createConnection({
  host: 'localhost', 
  user: 'root', 
  password: 'root1', 
  database: 'banco_seguro' 
});

// Middleware para analizar el cuerpo de las solicitudes (JSON)
app.use(express.json());

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('¡API Bancaria En Funcionamiento!');
});

// Función Lambda para depositar dinero
app.post('/depositar', async (req, res) => {
  const { numeroCuenta, monto } = req.body;
  try {
    const [rows] = await db.execute(
      'UPDATE CuentaBancaria SET saldo = saldo + ? WHERE numeroCuenta = ?',
      [monto, numeroCuenta]
    );

    if (rows.affectedRows > 0) {
      const idTransaccion = uuidv4();
      await db.execute(
        'INSERT INTO Transaccion (tipo, monto, idCuenta) VALUES (?, ?, ?)',
        ['Deposito', monto, numeroCuenta]
      );
      res.json({ mensaje: 'Depósito exitoso', idTransaccion });
    } else {
      res.status(404).json({ mensaje: 'Número de cuenta no encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al realizar el depósito' });
  }
});

// Función Lambda para retirar dinero
app.post('/retirar', async (req, res) => {
  const { numeroCuenta, monto } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT saldo FROM CuentaBancaria WHERE numeroCuenta = ?',
      [numeroCuenta]
    );

    if (rows.length > 0) {
      const saldoActual = rows[0].saldo;

      if (saldoActual >= monto) {
        await db.execute(
          'UPDATE CuentaBancaria SET saldo = saldo - ? WHERE numeroCuenta = ?',
          [monto, numeroCuenta]
        );

        const idTransaccion = uuidv4();
        await db.execute(
          'INSERT INTO Transaccion (tipo, monto, idCuenta) VALUES (?, ?, ?)',
          ['Retiro', monto, numeroCuenta]
        );
        res.json({ mensaje: 'Retiro exitoso', idTransaccion });
      } else {
        res.status(400).json({ mensaje: 'Saldo insuficiente' });
      }
    } else {
      res.status(404).json({ mensaje: 'Número de cuenta no encontrado' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al realizar el retiro' });
  }
});

// Función Lambda para cambiar la clave de la tarjeta de débito
app.post('/cambiar_clave', async (req, res) => {
  const { tarjetaDebito, claveActual, nuevaClave } = req.body;
  try {
    const [rows] = await db.execute(
      'SELECT * FROM CuentaBancaria WHERE tarjetaDebito = ? AND claveTarjeta = ?',
      [tarjetaDebito, claveActual]
    );

    if (rows.length > 0) {
      await db.execute(
        'UPDATE CuentaBancaria SET claveTarjeta = ? WHERE tarjetaDebito = ?',
        [nuevaClave, tarjetaDebito]
      );
      res.json({ mensaje: 'Clave cambiada exitosamente' });
    } else {
      res.status(400).json({ mensaje: 'Tarjeta o clave actual incorrecta' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ mensaje: 'Error al cambiar la clave' });
  }
});

// Inicia el servidor
const port = 3000;
app.listen(port, () => {
  console.log(`Servidor escuchando en el puerto ${port}`);
});