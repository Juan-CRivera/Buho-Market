const express = require("express");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const sql = require("mssql");

//leer datos de formularios
const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// SQL
const dbConfig = {
  user: "usuariodef",
  password: "123",
  server: "JuanK",  // localhost
  port: 1433,           // puerto TCP/IP 
  database: "BuhoMarket",
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
};

// "rama" o conexion que se crea reutilizable
let pool;
async function getPool() {
  if (!pool) pool = await sql.connect(dbConfig);
  return pool;
}



// nodmailer!!!!
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "pruebabuho487@gmail.com",         // correo de buho market
    pass: "lgnfnvpimpmaecxo"      // contraseña de aplicación 
  }
});


app.get("/", (req, res) => res.send("Servidor funcionando"));


app.post("/enviarCorreoRecuperacion", async (req, res) => {
  try {
    const { correo } = req.body;

    // Validacion de correo que sea de la uca
    const regexUCA = /^[a-zA-Z0-9._%+-]+@uca\.edu\.sv$/;
    if (!regexUCA.test(correo)) {
      return res.status(400).send("Solo se permiten correos institucionales @uca.edu.sv");
    }

    const pool = await getPool();

    // Ver si el correo existe
    const result = await pool.request()
      .input("correo", sql.VarChar, correo)
      .query("SELECT * FROM usuarios WHERE correo = @correo");

    if (result.recordset.length === 0) {
      return res.send("Correo no registrado");
    }

    // Generar token y expiración
    const token = crypto.randomBytes(32).toString("hex");
    const expira = new Date(Date.now() + 3600000); // 1 hora

    // Guardar token
    await pool.request()
      .input("correo", sql.VarChar, correo)
      .input("token", sql.VarChar, token)
      .input("expira", sql.DateTime, expira)
      .query("INSERT INTO tokens (correo, token, expira) VALUES (@correo, @token, @expira)");

    // Crear link de recuperación
    const link = `http://localhost:3000/RestablecerContrasena?token=${token}&correo=${correo}`;

    // Enviar correo
    try {
      const info = await transporter.sendMail({
        from: '"Buho Market" <pruebabuho487@gmail.com>',
        to: correo,
        subject: "Recuperación de contraseña",
        html: `<p>Haz click <a href="${link}">aquí</a> para restablecer tu contraseña. Este link es válido por 1 hora.</p>`
      });
      console.log("Correo enviado:", info.response);
      res.send("Correo de recuperación enviado correctamente");
    } catch (mailError) {
      console.error("Error enviando correo:", mailError);
      res.status(500).send("No se pudo enviar el correo. Revisa la configuración de Gmail.");
    }

  } catch (error) {
    console.error("Error en el backend:", error);
    res.status(500).send("Error al procesar la solicitud");
  }
});

//esto aun no sirve xddd

app.post("/restablecerContrasena", async (req, res) => {
  try {
    const { correo, token, password } = req.body;
    const pool = await getPool();

    // Verificar token
    const result = await pool.request()
      .input("correo", sql.VarChar, correo)
      .input("token", sql.VarChar, token)
      .query("SELECT * FROM tokens WHERE correo = @correo AND token = @token AND expira > GETDATE()");

    if (result.recordset.length === 0) {
      return res.status(400).send("Token inválido o expirado");
    }

    // Hash
    const hash = await bcrypt.hash(password, 10);

 
    await pool.request()
      .input("correo", sql.VarChar, correo)
      .input("password", sql.VarChar, hash)
      .query("UPDATE usuarios SET password = @password WHERE correo = @correo");


    await pool.request()
      .input("correo", sql.VarChar, correo)
      .input("token", sql.VarChar, token)
      .query("DELETE FROM tokens WHERE correo = @correo AND token = @token");

    res.send("Contraseña actualizada correctamente");

  } catch (error) {
    console.error("Error al restablecer contraseña:", error);
    res.status(500).send("Error al restablecer contraseña");
  }
});

// Iniciar servidor
app.listen(3000, () => console.log("Servidor en http://localhost:3000"));