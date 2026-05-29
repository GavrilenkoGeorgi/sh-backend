//TODO: use mongoose schema for this (.select('+password'))
export const USER_SAFE_FIELDS =
  '-password -activationLink -passwordUpdateToken -results -multiplayerResults'

// export const SANS_RESULTS = '-results'
