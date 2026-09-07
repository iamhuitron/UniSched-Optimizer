/**
 * Curated catalog of universities/faculties/careers with pre-loaded datasets.
 *
 * IMPORTANT: only give a CatalogEntry a datasetPath once that data has actually
 * been extracted and checked against a real, official source — like the FES
 * Cuautitlán Informática entries below, built from images a student uploaded
 * plus the official schedule portal (masam.cuautitlan.unam.mx/horarios), cross
 * -checked by hand. Never add a plausible-looking entry for a career we
 * haven't verified: a student could use it to make real registration
 * decisions. An entry with no datasetPath is meant to stay that way — visible
 * as "próximamente" — until someone actually uploads and verifies that
 * career's PDF. See the README for how to contribute one.
 */

export interface CatalogEntry {
  id: string;
  careerName: string;
  /** short qualifier shown next to the career, e.g. "3er semestre · Campo 4" */
  detail?: string;
  /** omitted = not verified yet; renders as "próximamente" instead of a clickable entry */
  datasetPath?: string;
}

export interface CatalogFaculty {
  id: string;
  name: string;
  entries: CatalogEntry[];
  /** where to find this faculty's official published schedules, for whoever adds the next entry */
  sourceUrl?: string;
}

export interface CatalogUniversity {
  id: string;
  shortName: string;
  name: string;
  faculties: CatalogFaculty[];
}

export const CATALOG: CatalogUniversity[] = [
  {
    id: 'unam',
    shortName: 'UNAM',
    name: 'Universidad Nacional Autónoma de México',
    faculties: [
      {
        id: 'fes-cuautitlan',
        name: 'FES Cuautitlán',
        sourceUrl: 'https://masam.cuautitlan.unam.mx/horarios/',
        entries: [
          {
            id: 'fesc-informatica-1er',
            careerName: 'Licenciatura en Informática',
            detail: '1er semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-informatica-1er-semestre.json',
          },
          {
            id: 'fesc-informatica-3er',
            careerName: 'Licenciatura en Informática',
            detail: '3er semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-3er-semestre.json',
          },
          {
            id: 'fesc-informatica-4o',
            careerName: 'Licenciatura en Informática',
            detail: '4to semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-informatica-4o-semestre.json',
          },
          {
            id: 'fesc-informatica-5o',
            careerName: 'Licenciatura en Informática',
            detail: '5to semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-informatica-5o-semestre.json',
          },
          {
            id: 'fesc-informatica-7o',
            careerName: 'Licenciatura en Informática',
            detail: '7mo semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-informatica-7o-semestre.json',
          },
          {
            id: 'fesc-informatica-9o',
            careerName: 'Licenciatura en Informática',
            detail: '9no semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-informatica-9o-semestre.json',
          },
          // The rest of FES Cuautitlán's 16 licenciaturas — real career names, no
          // fabricated data. Every one of these is published at the sourceUrl above,
          // same table format as Informática, ready for the next person to verify.
          {
            id: 'fesc-ing-industrial-3er',
            careerName: 'Ingeniería Industrial',
            detail: '3er semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-industrial-3er-semestre.json',
          },
          { id: 'fesc-ing-industrial', careerName: 'Ingeniería Industrial' },
          { id: 'fesc-quimica', careerName: 'Química' },
          { id: 'fesc-quimica-industrial', careerName: 'Química Industrial' },
          { id: 'fesc-bioquimica-diagnostica', careerName: 'Bioquímica Diagnóstica' },
          { id: 'fesc-farmacia', careerName: 'Farmacia' },
          { id: 'fesc-ing-alimentos', careerName: 'Ingeniería en Alimentos' },
          { id: 'fesc-mvz', careerName: 'Medicina Veterinaria y Zootecnia' },
          { id: 'fesc-ing-agricola', careerName: 'Ingeniería Agrícola' },
          { id: 'fesc-ime', careerName: 'Ingeniería Mecánica Eléctrica' },
          { id: 'fesc-ing-quimica', careerName: 'Ingeniería Química' },
          { id: 'fesc-tecnologia', careerName: 'Licenciatura en Tecnología' },
          { id: 'fesc-ing-telecom', careerName: 'Ingeniería en Telecomunicaciones, Sistemas y Electrónica' },
          { id: 'fesc-contaduria', careerName: 'Contaduría' },
          { id: 'fesc-administracion', careerName: 'Administración' },
          { id: 'fesc-diseno', careerName: 'Diseño y Comunicación Visual' },
          { id: 'fesc-diseno-distancia', careerName: 'Diseño y Comunicación Visual (a distancia)' },
        ],
      },
      {
        id: 'fi',
        name: 'Facultad de Ingeniería (Ciudad Universitaria)',
        sourceUrl: 'https://www.ingenieria.unam.mx/',
        entries: [
          {
            id: 'fi-ing-computacion-3er',
            careerName: 'Ingeniería en Computación',
            detail: '3er semestre · CU',
            datasetPath: '/fixtures/unam-fi-computacion-3er-semestre.json',
          },
          { id: 'fi-ing-mecatronica', careerName: 'Ingeniería Mecatrónica' },
          { id: 'fi-ing-industrial', careerName: 'Ingeniería Industrial' },
          { id: 'fi-ing-civil', careerName: 'Ingeniería Civil' },
          { id: 'fi-ing-sistemas-biomedicos', careerName: 'Ingeniería en Sistemas Biomédicos' },
        ],
      },
      {
        id: 'fc',
        name: 'Facultad de Ciencias (Ciudad Universitaria)',
        sourceUrl: 'https://www.fciencias.unam.mx/docencia/horarios',
        entries: [
          { id: 'fc-ciencias-computacion', careerName: 'Ciencias de la Computación' },
          { id: 'fc-matematicas', careerName: 'Matemáticas' },
          { id: 'fc-actuaria', careerName: 'Actuaría' },
          { id: 'fc-fisica', careerName: 'Física' },
          { id: 'fc-biologia', careerName: 'Biología' },
        ],
      },
      {
        id: 'fes-acatlan',
        name: 'FES Acatlán',
        sourceUrl: 'https://www.acatlan.unam.mx/',
        entries: [
          {
            id: 'fesa-mac-3er',
            careerName: 'Matemáticas Aplicadas y Computación',
            detail: '3er semestre',
            datasetPath: '/fixtures/unam-fesa-mac-3er-semestre.json',
          },
          { id: 'fesa-derecho', careerName: 'Derecho' },
          { id: 'fesa-arquitectura', careerName: 'Arquitectura' },
          { id: 'fesa-comunicacion', careerName: 'Comunicación' },
          { id: 'fesa-relaciones-internacionales', careerName: 'Relaciones Internacionales' },
        ],
      },
      {
        id: 'fes-aragon',
        name: 'FES Aragón',
        sourceUrl: 'https://www.aragon.unam.mx/',
        entries: [
          { id: 'fesar-ing-computacion', careerName: 'Ingeniería en Computación' },
          { id: 'fesar-ing-mecanica', careerName: 'Ingeniería Mecánica' },
          { id: 'fesar-ing-civil', careerName: 'Ingeniería Civil' },
          { id: 'fesar-ing-industrial', careerName: 'Ingeniería Industrial' },
          { id: 'fesar-arquitectura', careerName: 'Arquitectura' },
        ],
      },
      {
        id: 'fes-iztacala',
        name: 'FES Iztacala',
        sourceUrl: 'https://www.iztacala.unam.mx/',
        entries: [
          { id: 'fesi-medicina', careerName: 'Médico Cirujano' },
          { id: 'fesi-psicologia', careerName: 'Psicología' },
          { id: 'fesi-biologia', careerName: 'Biología' },
          { id: 'fesi-odontologia', careerName: 'Cirujano Dentista' },
        ],
      },
      {
        id: 'fes-zaragoza',
        name: 'FES Zaragoza',
        sourceUrl: 'https://www.zaragoza.unam.mx/',
        entries: [
          { id: 'fesz-medicina', careerName: 'Médico Cirujano' },
          { id: 'fesz-qfb', careerName: 'Química Farmacéutico Biológica' },
          { id: 'fesz-psicologia', careerName: 'Psicología' },
          { id: 'fesz-enfermeria', careerName: 'Enfermería' },
        ],
      },
    ],
  },
  {
    id: 'ipn',
    shortName: 'IPN',
    name: 'Instituto Politécnico Nacional',
    faculties: [
      {
        id: 'escom',
        name: 'ESCOM — Escuela Superior de Cómputo',
        sourceUrl: 'https://www.escom.ipn.mx/',
        entries: [
          {
            id: 'escom-isc-3er',
            careerName: 'Ingeniería en Sistemas Computacionales',
            detail: '3er semestre · Zacatenco',
            datasetPath: '/fixtures/ipn-escom-sistemas-3er-semestre.json',
          },
          { id: 'escom-ciencia-datos', careerName: 'Licenciatura en Ciencia de Datos' },
          { id: 'escom-ia', careerName: 'Ingeniería en Inteligencia Artificial' },
        ],
      },
      {
        id: 'upiicsa',
        name: 'UPIICSA — Unidad Interdisciplinaria de Ingeniería y Ciencias',
        sourceUrl: 'https://www.upiicsa.ipn.mx/',
        entries: [
          {
            id: 'upiicsa-inf-3er',
            careerName: 'Ingeniería en Informática',
            detail: '3er semestre · Tezontle',
            datasetPath: '/fixtures/ipn-upiicsa-informatica-3er-semestre.json',
          },
          { id: 'upiicsa-ing-industrial', careerName: 'Ingeniería Industrial' },
          { id: 'upiicsa-transporte', careerName: 'Ingeniería en Transporte' },
          { id: 'upiicsa-administracion', careerName: 'Licenciatura en Administración Industrial' },
        ],
      },
      {
        id: 'esime-zac',
        name: 'ESIME Zacatenco',
        sourceUrl: 'https://www.esimez.ipn.mx/',
        entries: [
          { id: 'esimez-ice', careerName: 'Ingeniería en Comunicaciones y Electrónica' },
          { id: 'esimez-ica', careerName: 'Ingeniería en Control y Automatización' },
          { id: 'esimez-ie', careerName: 'Ingeniería Eléctrica' },
          { id: 'esimez-isisa', careerName: 'Ingeniería en Sistemas Automotrices' },
        ],
      },
    ],
  },
  {
    id: 'uam',
    shortName: 'UAM',
    name: 'Universidad Autónoma Metropolitana',
    faculties: [
      {
        id: 'uam-azc',
        name: 'Unidad Azcapotzalco (CBI)',
        sourceUrl: 'https://www.azc.uam.mx/',
        entries: [
          {
            id: 'uam-azc-comp-3er',
            careerName: 'Ingeniería en Computación',
            detail: '3er trimestre',
            datasetPath: '/fixtures/uam-azc-computacion-3er-trimestre.json',
          },
          { id: 'uam-azc-industrial', careerName: 'Ingeniería Industrial' },
          { id: 'uam-azc-electronica', careerName: 'Ingeniería Electrónica' },
          { id: 'uam-azc-mecanica', careerName: 'Ingeniería Mecánica' },
          { id: 'uam-azc-civil', careerName: 'Ingeniería Civil' },
        ],
      },
      {
        id: 'uam-iztapalapa',
        name: 'Unidad Iztapalapa (CBI)',
        sourceUrl: 'https://www.izt.uam.mx/',
        entries: [
          { id: 'uam-izt-computacion', careerName: 'Licenciatura en Computación' },
          { id: 'uam-izt-matematicas', careerName: 'Licenciatura en Matemáticas' },
          { id: 'uam-izt-fisica', careerName: 'Licenciatura en Física' },
          { id: 'uam-izt-quimica', careerName: 'Licenciatura en Química' },
        ],
      },
      {
        id: 'uam-xochimilco',
        name: 'Unidad Xochimilco (CSH / CIMS)',
        sourceUrl: 'https://www.xoc.uam.mx/',
        entries: [
          { id: 'uam-xoc-diseno', careerName: 'Diseño de la Comunicación Gráfica' },
          { id: 'uam-xoc-medicina', careerName: 'Medicina' },
          { id: 'uam-xoc-comunicacion', careerName: 'Comunicación Social' },
        ],
      },
      {
        id: 'uam-cuajimalpa',
        name: 'Unidad Cuajimalpa (CCD / CNI)',
        sourceUrl: 'https://www.cua.uam.mx/',
        entries: [
          { id: 'uam-cuaj-tsi', careerName: 'Tecnologías y Sistemas de Información' },
          { id: 'uam-cuaj-matematicas', careerName: 'Matemáticas Aplicadas' },
          { id: 'uam-cuaj-diseno', careerName: 'Diseño' },
        ],
      },
    ],
  },
];
