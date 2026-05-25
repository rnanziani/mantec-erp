import dotenv from 'dotenv';

import pg from 'pg';



dotenv.config();



const pool = new pg.Pool({

  host: process.env.DB_HOST || 'localhost',

  port: parseInt(process.env.DB_PORT || '5432', 10),

  database: process.env.DB_NAME || 'mantec_erc',

  user: process.env.DB_USER || 'postgres',

  password: process.env.DB_PASSWORD || 'postgres',

});



/** Permisos que el menú "Nivel de Acceso" necesita (padre + hijos) */

const REQUIRED = [

  { nombre: 'MENU_NIVEL_ACCESO', descripcion: 'Acceso al menú Nivel de Acceso', orden: 2000 },

  { nombre: 'MENU_NIVEL_ACCESO_USUARIOS', descripcion: 'Usuarios', orden: 2130 },

  { nombre: 'MENU_NIVEL_ACCESO_PERMISOS', descripcion: 'Catálogo de permisos', orden: 2140 },

  { nombre: 'MENU_NIVEL_ACCESO_NIVELES', descripcion: 'Nivel de acceso (roles)', orden: 2150 },

  { nombre: 'MENU_NIVEL_ACCESO_ASIGNACION', descripcion: 'Asignación niveles', orden: 2160 },

  { nombre: 'MENU_NIVEL_ACCESO_PERMISOS_DIRECTOS', descripcion: 'Permisos directos', orden: 2170 },

  { nombre: 'MENU_NIVEL_ACCESO_HISTORIAL', descripcion: 'Historial contraseñas', orden: 2180 },

  { nombre: 'MENU_NIVEL_ACCESO_INTENTOS', descripcion: 'Intentos de login', orden: 2190 },

  { nombre: 'MENU_NIVEL_ACCESO_SESIONES', descripcion: 'Sesiones', orden: 2200 },

  { nombre: 'MENU_NIVEL_ACCESO_PARAMETROS', descripcion: 'Parámetros del sistema', orden: 2210 },

];



const NIVEL_ID = 1;

const USER_ID = 1;



async function ensurePermiso({ nombre, descripcion, orden }) {

  let res = await pool.query(

    `SELECT id_permiso_05 FROM tbl_05_permiso WHERE nombre_permiso_05 = $1`,

    [nombre]

  );

  if (res.rows.length > 0) {

    await pool.query(

      `UPDATE tbl_05_permiso SET descripcion_05 = $1, orden_05 = $2 WHERE nombre_permiso_05 = $3`,

      [descripcion, orden, nombre]

    );

    return res.rows[0].id_permiso_05;

  }



  res = await pool.query(

    `INSERT INTO tbl_05_permiso (nombre_permiso_05, descripcion_05, orden_05)

     VALUES ($1, $2, $3)

     RETURNING id_permiso_05`,

    [nombre, descripcion, orden]

  );

  console.log('Creado en catálogo:', nombre, 'id', res.rows[0].id_permiso_05);

  return res.rows[0].id_permiso_05;

}



async function main() {

  for (const item of REQUIRED) {

    const idPermiso = await ensurePermiso(item);



    const insNivel = await pool.query(

      `INSERT INTO tbl_050_nivel_permiso (id_nivel_04, id_permiso_05)

       SELECT $1, $2

       WHERE NOT EXISTS (

         SELECT 1 FROM tbl_050_nivel_permiso

         WHERE id_nivel_04 = $1 AND id_permiso_05 = $2

       )

       RETURNING *`,

      [NIVEL_ID, idPermiso]

    );

    if (insNivel.rowCount) console.log('Nivel 1 +', item.nombre);



    const insUser = await pool.query(

      `INSERT INTO tbl_000_usuario_permiso (id_usuario_000, id_permiso_000)

       SELECT $1, $2

       WHERE NOT EXISTS (

         SELECT 1 FROM tbl_000_usuario_permiso

         WHERE id_usuario_000 = $1 AND id_permiso_000 = $2

       )

       RETURNING *`,

      [USER_ID, idPermiso]

    );

    if (insUser.rowCount) console.log('Usuario 1 +', item.nombre);

  }



  console.log('\nListo. Cierra sesión y vuelve a entrar con rnanziani@gmail.com');

  await pool.end();

}



main().catch((e) => {

  console.error(e);

  process.exit(1);

});

