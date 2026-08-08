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
          { id: 'fesc-ing-industrial', careerName: 'Ingeniería Industrial' },
          { id: 'fesc-ing-telecom', careerName: 'Ingeniería en Telecomunicaciones, Sistemas y Electrónica' },
          { id: 'fesc-contaduria', careerName: 'Contaduría' },
          { id: 'fesc-administracion', careerName: 'Administración' },
          { id: 'fesc-diseno', careerName: 'Diseño y Comunicación Visual' },
          { id: 'fesc-diseno-distancia', careerName: 'Diseño y Comunicación Visual (a distancia)' },
        ],
      },
      { id: 'fi', name: 'Facultad de Ingeniería (Ciudad Universitaria)', entries: [] },
      { id: 'fc', name: 'Facultad de Ciencias', entries: [] },
      { id: 'fes-acatlan', name: 'FES Acatlán', entries: [] },
      { id: 'fes-aragon', name: 'FES Aragón', entries: [] },
      { id: 'fes-iztacala', name: 'FES Iztacala', entries: [] },
      { id: 'fes-zaragoza', name: 'FES Zaragoza', entries: [] },
    ],
  },
  {
    id: 'ipn',
    shortName: 'IPN',
    name: 'Instituto Politécnico Nacional',
    faculties: [
      { id: 'escom', name: 'ESCOM — Escuela Superior de Cómputo', entries: [] },
      { id: 'esime-zac', name: 'ESIME Zacatenco', entries: [] },
      { id: 'upiicsa', name: 'UPIICSA', entries: [] },
    ],
  },
  {
    id: 'uam',
    shortName: 'UAM',
    name: 'Universidad Autónoma Metropolitana',
    faculties: [
      { id: 'uam-azc', name: 'Unidad Azcapotzalco', entries: [] },
      { id: 'uam-iztapalapa', name: 'Unidad Iztapalapa', entries: [] },
      { id: 'uam-xochimilco', name: 'Unidad Xochimilco', entries: [] },
    ],
  },
];
