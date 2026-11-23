export const BUSINESS = {
  legalName: "Gulab Auto Garage",
  brand: "WS Green",
  address: "1 Akshardham Complex, near Milap Theatre, S.V. Road, Malad West, Mumbai 400064",
  stateCode: "27",
  stateName: "Maharashtra",
  phone: "+91 98217 84847",
  whatsapp: "919821784847",
  email: "gulabautoev@gmail.com",
} as const

export const RETURNS = { faultyDays: 2, wrongPartDays: 7 } as const

export const consumerCare = `${BUSINESS.legalName}, ${BUSINESS.phone}, ${BUSINESS.email}`
