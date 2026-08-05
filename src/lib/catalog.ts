/**
 * Curated catalog of universities/faculties/careers with pre-loaded datasets.
 *
 * IMPORTANT: only list a CatalogEntry (with a datasetPath) for data that has
 * actually been extracted and checked against a real, official source — like
 * fixtures/fes-cuautitlan-3er-semestre.json, built from the images a student
 * uploaded and cross-checked by hand. Never add a plausible-looking entry for
 * an institution we haven't verified: a student could use it to make real
 * registration decisions. A faculty with no entries yet is meant to stay
 * that way — visible as "próximamente" — until someone actually uploads and
 * verifies that school's PDF. See the README for how to contribute one.
 */

export interface CatalogEntry {
  id: string;
  careerName: string;
  /** short qualifier shown next to the career, e.g. "3er semestre · Campo 4" */
  detail: string;
  datasetPath: string;
}

export interface CatalogFaculty {
  id: string;
  name: string;
  /** empty on purpose = no verified dataset for this faculty yet */
  entries: CatalogEntry[];
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
        entries: [
          {
            id: 'fesc-informatica-3er',
            careerName: 'Licenciatura en Informática',
            detail: '3er semestre · Campo 4',
            datasetPath: '/fixtures/fes-cuautitlan-3er-semestre.json',
          },
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
