import databaseService from "../database-service/index.js"

const DDL_EC2 = `
  CREATE TABLE IF NOT EXISTS ec2 (
    nome varchar NULL,
    instancia varchar NULL,
    estado_instancia varchar NULL,
    tipo_instancia varchar NULL,
    id_publico varchar NULL,
    ip_privado varchar NULL,
    monitoramento varchar NULL,
    grupo_seguranca varchar NULL,
    nome_chave varchar NULL,
    id_volume varchar NULL,
    nome_dispositivo varchar NULL,
    tipo_dispositivo varchar NULL,
    data_lancamento varchar NULL,
    plataforma varchar NULL,
    emissor varchar NULL
  )
`

const DDL_RDS = `
  CREATE TABLE IF NOT EXISTS rds (
    id_rds varchar NULL,
    status varchar NULL,
    regiao_az varchar NULL,
    tamanho varchar NULL,
    vpc varchar NULL,
    multi_az varchar NULL,
    tipo_armazenamento varchar NULL,
    armazenamento varchar NULL,
    emissor varchar NULL
  )
`

const DDL_EBS = `
  CREATE TABLE IF NOT EXISTS ebs (
    nome varchar NULL,
    id_volume varchar NULL,
    tipo varchar NULL,
    tamanho varchar NULL,
    estado varchar NULL,
    recursos_anexados varchar NULL
  )
`

const DDL_CUSTOS_POR_EMISSOR = `
  CREATE TABLE IF NOT EXISTS custos_por_emissor (
    emissor varchar NOT NULL,
    url varchar NULL,
    env varchar NULL,
    proporcao numeric(19, 6) NULL,
    rds numeric(19, 2) NULL,
    vpc numeric(19, 2) NULL,
    ec2 numeric(19, 2) NULL,
    servicos_restantes numeric(19, 2) NULL,
    impostos numeric(19, 2) NULL,
    total numeric(19, 2) NULL,
    CONSTRAINT custos_por_emissor_pkey PRIMARY KEY (emissor)
  )
`

async function migrate() {
  await databaseService.runQuery(DDL_EC2)
  await databaseService.runQuery(DDL_EBS)
  await databaseService.runQuery(DDL_RDS)
  await databaseService.runQuery(DDL_CUSTOS_POR_EMISSOR)
}

export default {
  migrate
}