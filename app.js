const express = require("express");
const { Op } = require("sequelize");
const jwt = require("jsonwebtoken");
const { User, Post, Comment, Like} = require("./models");
const authMiddleware = require("./middlewares/auth-middleware");
const app = express();
const router = express.Router();
app.use(express.json());

//회원가입
router.post("/users", async (req, res) => {
    const { nickname, password, confirmPassword } = req.body;

    const existUsers = await User.findAll({attributes: ['nickname'],where:{nickname:nickname}});

    if (existUsers.length) {
        res.status(412).send({errorMessage: "중복된 닉네임입니다.",});
        return;
    }
    if (password !== confirmPassword) {
        res.status(412).send({errorMessage: "패스워드가 일치하지 않습니다.",});
        return;
    }

    if (nickname.length<4 || !(nickname.search(/[^A-Za-z0-9_-]/) === -1)){
        res.status(412).send({errorMessage: "ID의 형식이 일치하지 않습니다.",});
        return;
    }

    if (password.length<5 || password.includes(nickname)){
        res.status(412).send({errorMessage: "패스워드 형식이 일치하지 않습니다.",});
        return;
    }
    
    await User.create({ nickname, password });

    res.status(201).send({ message: "회원 가입에 성공하였습니다." });
});
//로그인
router.post("/login", async (req, res) => {
    const { nickname, password } = req.body;
    if(localStorage.getItem("token")){
        getSelf(function(){
            res.send("이미 로그인이 되어있습니다.")
            return
        })
    }
    try{
        const user = await User.findOne({ where: { nickname, password } });
        if (!user) {
            res.status(412).send({errorMessage: "닉네임 또는 패스워드를 확인해주세요.",});
            return;
        }
        const token = jwt.sign({ userId: user.userId }, "customized-secret-key");
        res.send({token,message:"로그인에 성공하였습니다."});
    }catch(err){
        res.status(400).send({errorMessage: "로그인에 실패하였습니다.",});
    }
});
//게시글 작성
router.post("/post",authMiddleware,async (req, res) => {
    const {userId} = res.locals.user
    const {title,content} = req.body
    try{
        try{
            if(title==="" || typeof(title)!=='string'){
                res.status(412).send({errorMessage: "게시글 제목의 형식이 올바르지 않습니다.",});
                return
            }
            else if(content==="" || typeof(content)!=='string'){
                res.status(412).send({errorMessage: "게시글 내용의 형식이 올바르지 않습니다.",});
                return
            }
            const created_posts = await Post.create({userId,title,content});
            res.status(201).json({created_posts});
        }catch(err){
            res.status(412).send({errorMessage: "데이터 형식이 올바르지 않습니다.",});
        }
	}catch(err){
	    res.status(400).json({errorMessage:'게시글 작성에 실패하였습니다.'})
	}
});
//게시글 목록 조회
router.get("/post", async (req, res) => {
    try{
        const post = await Post.findAll({attributes: ['postId', 'userId','title','like','createdAt','updatedAt'],})
        res.json({post})
    }catch{
        res.status(400).json({errorMessage:'게시글 조회에 실패하였습니다.'})
    }
});
//게시글 상세 조회
router.get("/post/:postId", async (req, res) => {
	try{
		const {postId} = req.params
		const detail = await Post.findAll({where:[{postId : postId}]})
		res.json({detail})
	}catch(err){
		res.status(400).json({errorMessage:'게시글 조회에 실패하였습니다.'})
	}
	
})
//게시글 수정
router.put("/post/:postId",authMiddleware, async(req,res) =>{
    const {userId} = res.locals.user
    const {postId} = req.params;
    const {title,content} = req.body;
    try{
        const exist = await Post.findAll({where:{[Op.and]:[{userId:userId},{postId:postId}]}})
        try{
            if(title==="" || typeof(title)!=='string'){
                res.status(412).send({errorMessage: "게시글 제목의 형식이 올바르지 않습니다.",});
                return
            }
            else if(content==="" || typeof(content)!=='string'){
                res.status(412).send({errorMessage: "게시글 내용의 형식이 올바르지 않습니다.",});
                return
            }
        }catch(err){
            res.status(412).send({errorMessage: "데이터 형식이 올바르지 않습니다.",});
        }
        try{
            if(exist.length){
                await Post.update({content:content,title:title},{where:{postId:postId}})
                await Post.update({updatedAt:new Date},{where:{postId:postId}})
                res.json({message:"게시글을 수정하였습니다."});
            }else{
                res.status(404).send({errorMessage: "게시글이 존재하지 않습니다.",});
            }
        }catch(err){
            res.status(401).send({errorMessage: "게시글이 정상적으로 수정되지 않았습니다.",});
        }
	}catch(err){
	    res.status(400).json({errorMessage:'게시글 수정에 실패하였습니다.'})
	}
})
//게시글 삭제
router.delete("/post/:postId",authMiddleware,async (req, res) => {
    const {userId} = res.locals.user
    const {postId} = req.params;
	try{
        const exist = await Post.findAll({where:{[Op.and]:[{userId:userId},{postId:postId}]}})
        if(exist.length){
            try{
                await Post.destroy({where:{postId:postId}})
                res.json({message:"게시글을 삭제하였습니다."})
            }catch(err){
                res.status(401).send({errorMessage: "게시글이 정상적으로 삭제되지 않았습니다.",});
            }
            
        }else{
            res.status(404).json({errorMessage:'게시글이 존재하지 않습니다.'})
            return
        }
	}catch(err){
		res.status(400).json({errorMessage:'게시글 작성에 실패하였습니다.'})
	}
});
//댓글 조회
router.get("/comment/:postId", async (req, res) => {
    const {postId} = req.params
	try{
		const postComment = await Comment.findAll({where:{postId:postId}})
		res.json({postComment})
	}catch(err){
		res.status(400).json({errorMessage:'댓글 조회에 실패하였습니다.'})
	}
})
//댓글 작성
router.post("/comment/:postId",authMiddleware,async(req,res)=>{
    const {userId} = res.locals.user
    const {postId} = req.params
    const {comment} = req.body
    const nickname = await User.findOne({where:{userId:userId}})
	try{
        if(comment==="" || typeof(comment)!=='string'){
            res.status(412).json({errorMessage:'데이터 형식이 올바르지 않습니다.'})
            return
        }
        const created_comment = await Comment.create({userId,postId,nickname,comment});
        res.json({created_comment})
	}catch(err){
        res.status(400).json({errorMessage:'댓글 작성에 실패하였습니다.'})
	}
})
//댓글 수정
router.put("/comment/:commentId",authMiddleware,async(req,res) =>{
    const {userId} = res.locals.user
    const {commentId} = req.params;
	const {comment} = req.body;
	try{
		const exist = await Comment.findAll({where:{[Op.and]:[{userId:userId},{commentId:commentId}]}})
		if(comment==="" || typeof(comment)!=='string'){
            res.status(412).json({errorMessage:'데이터 형식이 올바르지 않습니다.'})
        }else{
            try{
                if(exist.length){
                    await Comment.update({comment:comment},{where:{commentId:commentId}})
                    await Comment.update({updatedAt:new Date},{where:{commentId:commentId}})
                    res.json({message:"댓글을 수정하였습니다."})
                }else{
                    res.status(404).send({errorMessage: "댓글이 존재하지 않습니다.",});
                }
            }catch(err){
                res.status(400).send({errorMessage: "댓글 수정이 정상적으로 처리되지 않았습니다.",});
            }
        }
	}catch(err){
		res.status(400).send({errorMessage: "댓글 수정에 실패하였습니다.",});
	}
})
//댓글 삭제
router.delete("/comment/:commentId",authMiddleware,async (req, res) => {
    const {userId} = res.locals.user
    const {commentId} = req.params;
	try{
        const exist = await Comment.findAll({where:{[Op.and]:[{userId:userId},{commentId:commentId}]}})
        try{
            if(exist.length){
                await Comment.destroy({where:{commentId:commentId}})
                res.json({message:"댓글을 삭제하였습니다."})
            }else{
                res.status(404).send({errorMessage: "댓글이 존재하지 않습니다.",});
            }
        }catch(err){
            res.status(400).send({errorMessage: "댓글 삭제가 정상적으로 처리되지 않았습니다.",});
        }
	}catch(err){
        res.status(400).send({errorMessage: "댓글 삭제에 실패하였습니다.",});
	}
});
//좋아요 게시글 조회
router.get("/post/me/like",authMiddleware, async (req, res) => {
    const {userId} = res.locals.user
    try{
        const like_post = await Like.findAll({where:{userId:userId}})
        res.json({like_post})
    }catch{
        res.status(400).json({errorMessage:'좋아요 게시글 조회에 실패하였습니다.'})
    }
})
//게시글 좋아요
router.put("/post/:postId/like",authMiddleware,async(req,res)=>{
    const {userId} = res.locals.user
    const {postId} = req.params
	try{
        const exist = await Like.findAll({where:{[Op.and]:[{userId:userId},{postId:postId}]}})
        if(exist.length){
            await Post.increment({like:-1},{where:{postId:postId}})
            await Like.destroy({where:{[Op.and]:[{userId:userId},{postId:postId}]}})
            res.json({message:"게시글의 좋아요를 취소하였습니다."})
        }else{
            try{
                await Post.increment({like:+1},{where:{postId:postId}})
                const created_like = await Like.create({userId,postId});
                res.json({created_like})
            }catch(err){
                res.status(404).json({errorMessage: "게시글 좋아요에 실패하였습니다.",})
            }
        }
	}catch(err){
        res.status(400).json({errorMessage:'게시글이 존재하지 않습니다.'})
	}
})

app.use("/api", express.urlencoded({ extended: false }), router);
  
app.listen(8080, () => {
    console.log("서버가 요청을 받을 준비가 됐어요");
});