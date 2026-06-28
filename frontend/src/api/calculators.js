import api from './axios'

export const getOwnershipCost = (carId, years, annualKm, fuelPrice, condition = 'good', accidentHistory = false, multipleOwners = false, noServiceRecords = false) =>
  api.post('/calculators/ownership', {
    car_id: carId,
    years,
    annual_km: annualKm,
    fuel_price: fuelPrice,
    condition,
    accident_history: accidentHistory,
    multiple_owners: multipleOwners,
    no_service_records: noServiceRecords,
  }).then(r => r.data)

export const getDepreciation = (carId, condition = 'good', accidentHistory = false, multipleOwners = false, noServiceRecords = false) =>
  api.get(`/calculators/depreciation/${carId}`, {
    params: {
      condition,
      accident_history: accidentHistory,
      multiple_owners: multipleOwners,
      no_service_records: noServiceRecords,
    },
  }).then(r => r.data)
