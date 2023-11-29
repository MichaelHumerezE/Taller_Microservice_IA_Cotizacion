//import { NextResponse } from "next/server";
import getPool from '../../../utils/db';
import formidable from "formidable";
import s3 from '../../../utils/s3';
// Importa la biblioteca aws-sdk
import AWS from 'aws-sdk';
import { url } from 'inspector';

const fs = require('fs').promises;
const { NextRequest, NextResponse } = require('next/server');

export const POST = async (request, res) => {
    const data = await request.formData();
    const file = data.get('imagen');
    const services = JSON.parse(data.get('services'));
    //console.log(services);
    if (!file) {
        return NextResponse.json({ success: false });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Nombre único para el archivo en el bucket
    const key = `cotizaciones/fotos/${Date.now()}_${file.name}`;

    // Configura los parámetros para la operación de carga en S3
    const params = {
        Bucket: process.env.AWS_S3_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: file.type,
        ACL: 'public-read',  // Esto hace que el objeto sea público
    };

    try {
        // Realiza la operación de carga en S3
        await s3.upload(params).promise();

        // Obtén la URL pública del objeto cargado
        const publicUrl = `${process.env.AWS_BUCKET_URL}/${key}`;

        // Luego de cargar la imagen, inicia el modelo de reconocimiento
        const data = await iniciarModeloReconocimiento(key);
        console.log(data);
        //console.log(data.length);
        var final = [];
        if (data.length > 1) {
            for (let i = 0; i < data.length / 2; i++) {
                //console.log(data[i].Name);
                for (const service of services) {
                    //console.log(service);
                    if (data[i].Name == service.nombre) {
                        final.push(service);
                    }
                }
            }
        }else{
            for (const service of services) {
                //console.log(service);
                if (data[0].Name == service.nombre) {
                    final.push(service);
                }
            }
        }

        var total = 0;

        for (const precio of final) {
            total += precio.precio;
        }

        //BD POSTGRE
        const pool = getPool();
        // Realiza la operación de creación en la base de datos
        const currentDate = new Date();
        await pool.query(
            'INSERT INTO cotizacion (imagen, url, precio, fecha, id_vehiculo) VALUES ($1, $2, $3, $4, $5)',
            [key, publicUrl, total, currentDate.toLocaleString(), null]
        );

        // Devuelve una respuesta exitosa
        return NextResponse.json({ success: true, data: final, url: publicUrl });
    } catch (error) {
        console.error('Error: ', error);
        // Devuelve una respuesta de error
        return NextResponse.json({ success: false, error: 'Error interno del servidor' });
    }
}

export const GET = async () => {
    const pool = getPool();
    const cotizaciones = await pool.query(
        'Select * from cotizacion'
    );
    return NextResponse.json({ data: cotizaciones })
};

export const LAST = async () => {
    const pool = getPool();
    const id = await pool.query(
        'Select max(id) as id from cotizacion'
    );
    return NextResponse.json({ data: id })
};

//Funciones

// Función para iniciar el modelo de reconocimiento
async function iniciarModeloReconocimiento(key) {
    // Configura las credenciales de AWS
    AWS.config.update({
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        region: process.env.AWS_REGION,
    });

    // Configura el cliente de Rekognition
    const rekognition = new AWS.Rekognition();

    // Configura los parámetros para la detección de etiquetas
    const detectParams = {
        Image: {
            S3Object: {
                Bucket: process.env.AWS_S3_BUCKET,
                Name: key, // Reemplaza con la ruta correcta en tu bucket
            },
        },
        ProjectVersionArn: process.env.AWS_ARN_RECKOGNITIOM_LABEL, // Reemplaza con el ARN de tu modelo
    };

    // Realiza la detección de etiquetas
    var labels = await rekognition.detectCustomLabels(detectParams).promise();
    return labels.CustomLabels;
}
