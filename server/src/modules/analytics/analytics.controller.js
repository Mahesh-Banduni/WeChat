import analyticsService from "./analytics.service.js";

const getMostChattedUser = async(req, res, next) => {
  try {
    const userId = req.params.id;
    const result = await analyticsService.getMostChattedUser(userId);
    res.status(200).json(result);
  }
  catch(err){
    next(err);
  }
}

const getUserConnections = async(req, res, next) => {
  try {
    const userId = req.params.id;
    const result = await analyticsService.getUserConnections(userId);
    res.status(200).json(result);
  }
  catch(err){
    next(err);
  }
}

const getConnectionDateByName = async(req, res, next) => {
  try {
    const userId = req.params.id;
    const otherUserName= req.query.name;
    const result = await analyticsService.getConnectionDateByName(userId, otherUserName);
    res.status(200).json(result);
  }
  catch(err){
    next(err);
  }
}

export default {getMostChattedUser, getUserConnections, getConnectionDateByName};