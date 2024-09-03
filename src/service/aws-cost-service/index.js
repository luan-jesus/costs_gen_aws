import databaseService from "../database-service/index.js";

async function generate() {
  const costs = getEnvVariables()
  
  console.log('===========================')
  console.log('|           RDS           |')
  console.log('===========================')
  // Limpa valores prévios de rds
  await databaseService.runQuery(`update custos_por_emissor set rds = 0`)

  // Distribui valor gasto em computação de RDS, igualmente por emissores de uma mesma familia 
  await distributeRDSValuePerFamily(costs.rds.db_t4g_medium, 'db.t4g.medium')
  await distributeRDSValuePerFamily(costs.rds.db_m6g_xlarge, 'db.m6g.xlarge')
  await distributeRDSValuePerFamily(costs.rds.db_t4g_small, 'db.t4g.small')
  await distributeRDSValuePerFamily(costs.rds.db_m6g_large, 'db.m6g.large')

  // Distribui o valor de storage proporcionalmente entre todos emissores
  await distributeRDSStorageProportionally(costs.rds.storage)

  // Distribui proporcionalmente todo valor restante do valor total do RDS
  await distributeRDSRemainingValueProportionally(costs.rds.total)

  console.log('===========================')
  console.log('|           EC2           |')
  console.log('===========================')
  
  await databaseService.runQuery(`update custos_por_emissor set ec2 = 0`)
  // Distribui o valor gasto por familia, entre todas instancias da mesma familia
  await distributeEC2ValuePerFamily(costs.ec2.c5n_2xlarge, 'c5n.2xlarge')
  await distributeEC2ValuePerFamily(costs.ec2.t2_micro, 't2.micro')
  await distributeEC2ValuePerFamily(costs.ec2.c5n_4xlarge, 'c5n.4xlarge')
  await distributeEC2ValuePerFamily(costs.ec2.t2_nano, 't2.nano')
  await distributeEC2ValuePerFamily(costs.ec2.t3_small, 't3.small')
  await distributeEC2ValuePerFamily(costs.ec2.t2_small, 't2.small')
  await distributeEC2ValuePerFamily(costs.ec2.t4g_nano, 't4g.nano')
  await distributeEC2ValuePerFamily(costs.ec2.t3a_large, 't3a.large')
  await distributeEC2ValuePerFamily(costs.ec2.t3a_micro, 't3a.micro')
  await distributeEC2ValuePerFamily(costs.ec2.c5n_2xlarge, 'c5n.2xlarge')
  await distributeEC2ValuePerFamily(costs.ec2.t4g_medium, 't4g.medium')
  await distributeEC2ValuePerFamily(costs.ec2.t3a_medium, 't3a.medium')
  await distributeEC2ValuePerFamily(costs.ec2.t3a_2xlarge, 't3a.2xlarge')
  await distributeEC2ValuePerFamily(costs.ec2.t3a_xlarge, 't3a.xlarge')

  // Distribui proporcionalmente todo valor restante do valor total do RDS
  await distributeEC2RemainingValueProportionally(costs.ec2.total)


  console.log('===========================')
  console.log('|           VPC           |')
  console.log('===========================')
  
  // Distribui proporcionalmente todo valor de VPC
  await distributeVPCValueProportionally(costs.vpc.total)

  console.log('===========================')
  console.log('|          TAXES          |')
  console.log('===========================')

  // Distribui proporcionalmente todo valor dos impostos
  await distributeTaxesValueProportionally(costs.taxes.total)
  
  console.log('===========================')
  console.log('|        REMAINING        |')
  console.log('===========================')

  // Distribui proporcionalmente todo valor restante
  await distributeAllRemainingServices(costs.awsTotal)

  // Soma todos gastos na coluna total
  await databaseService.runQuery(`
    update custos_por_emissor set total = rds + ec2 + vpc + impostos + servicos_restantes
  `)
}

async function distributeAllRemainingServices(total = 0.0) {
  const dbResponse = await databaseService.runQuery(`
    select sum(rds + vpc + ec2 + impostos) total, count(*) qtd from custos_por_emissor
  `)

  const value = (total - Number.parseFloat(dbResponse.rows[0].total)) / Number.parseFloat(dbResponse.rows[0].qtd)

  const dbUpdateResponse = await databaseService.runQuery(`
    update custos_por_emissor set servicos_restantes = ${value}
  `)

  console.log(`Adicionado a cada emissor um valor proporcional ao valor total restante: ${value}. rowCount: ${dbUpdateResponse.rowCount}`)
}

async function distributeTaxesValueProportionally(total = 0.0) {
  const dbResponse = await databaseService.runQuery(`
    select count(*) qtd from custos_por_emissor cpe 
  `)

  const value = total / Number.parseFloat(dbResponse.rows[0].qtd)

  const dbUpdateResponse = await databaseService.runQuery(`
    update custos_por_emissor set impostos = ${value}
  `)

  console.log(`Adicionado a cada emissor um valor proporcional ao valor total dos Impostos: ${value}. rowCount: ${dbUpdateResponse.rowCount}`)
}

async function distributeVPCValueProportionally(vpcTotal = 0.0) {
  const dbResponse = await databaseService.runQuery(`
    select count(*) qtd from custos_por_emissor cpe 
  `)

  const vpcValue = vpcTotal / Number.parseFloat(dbResponse.rows[0].qtd)

  const dbUpdateResponse = await databaseService.runQuery(`
    update custos_por_emissor set vpc = ${vpcValue}
  `)

  console.log(`Adicionado a cada emissor um valor proporcional ao valor total do VPC: ${vpcTotal}. rowCount: ${dbUpdateResponse.rowCount}`)
}


async function distributeEC2ValuePerFamily(ec2Cost = 0.0, rdsType = '') {
  if (!!ec2Cost) {
    const dbResponse = await databaseService.runQuery(`
      select * from ec2 e 
      join custos_por_emissor cpe on cpe.emissor = e.emissor
      where tipo_instancia like '${rdsType}'
    `)

    if (!dbResponse?.rows?.length) {
      console.log(`Nenhum ec2 do tipo ${rdsType} foi encontrado`)
      return
    }

    const value = ec2Cost / dbResponse?.rows?.length

    const envs = dbResponse.rows.map(e => `'${e['emissor']}'`).join(', ')

    const dbUpdateResponse = await databaseService.runQuery(`
      update custos_por_emissor set ec2 = ${value}
      where emissor in (${envs})
    `)


    console.log(`Atualizado valor de ec2 ${rdsType} de ${dbUpdateResponse.rowCount} emissores, com valor: ${value}`)
  }
}

async function distributeEC2RemainingValueProportionally(ec2Total) {
  const dbResponse = await databaseService.runQuery(`
    select sum(ec2) ec2, count(*) qtd from custos_por_emissor cpe 
  `)

  const remainingValueToDistribute = (ec2Total - Number.parseFloat(dbResponse.rows[0].ec2)) / Number.parseFloat(dbResponse.rows[0].qtd) 

  const dbUpdateResponse = await databaseService.runQuery(`
    update custos_por_emissor set ec2 = ec2 + ${remainingValueToDistribute}
  `)

  console.log(`Adicionado a cada ec2 um valor proporcional ao valor restante total do RDS: ${remainingValueToDistribute}. rowCount: ${dbUpdateResponse.rowCount}`)
}

async function distributeRDSRemainingValueProportionally(rdsTotal) {
  const dbResponse = await databaseService.runQuery(`
    select sum(rds) rds from custos_por_emissor cpe 
  `)

  const remainingValueToDistribute = rdsTotal - Number.parseFloat(dbResponse.rows[0].rds || 0)

  const dbUpdateResponse = await databaseService.runQuery(`
    update custos_por_emissor set rds = rds + (${remainingValueToDistribute} * proporcao)
  `)

  console.log(`Adicionado a cada rds um valor proporcional ao valor restante total do RDS: ${remainingValueToDistribute}. rowCount: ${dbUpdateResponse.rowCount}`)
}

async function distributeRDSStorageProportionally(storageValue = 0.0) {
  const dbUpdateResponse = await databaseService.runQuery(`
    update custos_por_emissor set rds = rds + (${storageValue} * proporcao)
  `)

  console.log(`Adicionado a cada rds um valor proporcional ao valor total do storage: ${storageValue}. rowCount: ${dbUpdateResponse.rowCount}`)
}

async function distributeRDSValuePerFamily(rdsCost = 0.0, rdsType = '') {
  if (!!rdsCost) {
    const dbResponse = await databaseService.runQuery(`
      select * from rds r 
      join custos_por_emissor cpe on cpe.emissor = r.emissor
      where tamanho like '${rdsType}'
    `)

    if (!dbResponse?.rows?.length) {
      console.log(`Nenhum rds do tipo ${rdsType} foi encontrado`)
      return
    }

    const value = rdsCost / dbResponse?.rows?.length

    const envs = dbResponse.rows.map(e => `'${e['emissor']}'`).join(', ')

    const dbUpdateResponse = await databaseService.runQuery(`
      update custos_por_emissor set rds = ${value}
      where emissor in (${envs})
    `)


    console.log(`Atualizado valor de rds ${rdsType} de ${dbUpdateResponse.rowCount} emissores, com valor: ${value}`)
  }
}


function getEnvVariables() {
  return {
    awsTotal: Number.parseFloat(process.env.AWS_TOTAL),
    rds: {
      total: Number.parseFloat(process.env.RDS_TOTAL),
      storage: Number.parseFloat(process.env.RDS_STORAGE),
      db_t4g_medium: Number.parseFloat(process.env.RDS_DB_T4G_MEDIUM),
      db_m6g_xlarge: Number.parseFloat(process.env.RDS_DB_M6G_XLARGE),
      db_t4g_small: Number.parseFloat(process.env.RDS_DB_T4G_SMALL),
      db_m6g_large: Number.parseFloat(process.env.RDS_DB_M6G_LARGE),
    },
    ec2: {
      total: Number.parseFloat(process.env.EC2_TOTAL),
      t2_micro: Number.parseFloat(process.env.EC2_T2_MICRO),
      c5n_4xlarge: Number.parseFloat(process.env.EC2_C5N_4XLARGE),
      t2_nano: Number.parseFloat(process.env.EC2_T2_NANO),
      t3_small: Number.parseFloat(process.env.EC2_T3_SMALL),
      t2_small: Number.parseFloat(process.env.EC2_T2_SMALL),
      t4g_nano: Number.parseFloat(process.env.EC2_T4G_NANO),
      t3a_large: Number.parseFloat(process.env.EC2_T3A_LARGE),
      t3a_micro: Number.parseFloat(process.env.EC2_T3A_MICRO),
      c5n_2xlarge: Number.parseFloat(process.env.EC2_C5N_2XLARGE),
      t4g_medium: Number.parseFloat(process.env.EC2_T4G_MEDIUM),
      t3a_medium: Number.parseFloat(process.env.EC2_T3A_MEDIUM),
      t3a_2xlarge: Number.parseFloat(process.env.EC2_T3A_2XLARGE),
      t3a_xlarge: Number.parseFloat(process.env.EC2_T3A_XLARGE),
    },
    ebs: {
      total: Number.parseFloat(process.env.EBS_TOTAL),
    },
    vpc: {
      total: Number.parseFloat(process.env.VPC_TOTAL),
    },
    taxes: {
      total: Number.parseFloat(process.env.TAXES_TOTAL),
    },
  };
}

export default {
  generate,
};
