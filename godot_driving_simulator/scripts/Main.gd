extends Node3D

# メインシーンの制御スクリプト
# 武雄市運転シミュレーターのメインロジック

@onready var car: VehicleBody3D = $Car
@onready var camera: Camera3D = $Camera3D

# 車両の物理パラメータ
var engine_force_value: float = 150.0
var brake_force_value: float = 15.0
var steering_limit: float = 0.5
var steering_speed: float = 5.0

# 車両の状態
var current_steering: float = 0.0
var current_engine_force: float = 0.0
var current_brake_force: float = 0.0

# 車両の統計情報
var speed: float = 0.0
var distance_traveled: float = 0.0
var start_position: Vector3

func _ready():
	# 初期化
	start_position = car.global_position
	print("武雄市運転シミュレーターが起動しました")
	print("操作方法:")
	print("W/↑: 前進")
	print("S/↓: 後退")
	print("A/←: 左折")
	print("D/→: 右折")
	print("Space: ブレーキ")
	print("Shift: ハンドブレーキ")

func _physics_process(delta):
	# 入力の処理
	handle_input()
	
	# 車輪への力を適用
	apply_wheel_forces()
	
	# カメラの追従
	update_camera()
	
	# 統計情報の更新
	update_stats(delta)

func handle_input():
	# エンジンフォース（前進・後退）
	var input_forward = Input.get_action_strength("move_forward")
	var input_backward = Input.get_action_strength("move_backward")
	
	current_engine_force = (input_forward - input_backward) * engine_force_value
	
	# ブレーキ
	var input_brake = Input.get_action_strength("brake")
	current_brake_force = input_brake * brake_force_value
	
	# ハンドブレーキ
	var input_handbrake = Input.get_action_strength("handbrake")
	if input_handbrake > 0:
		current_brake_force += brake_force_value * 2.0
	
	# ステアリング
	var input_steering = Input.get_action_strength("turn_right") - Input.get_action_strength("turn_left")
	current_steering = move_toward(current_steering, input_steering * steering_limit, steering_speed * delta)

func apply_wheel_forces():
	# 前輪のステアリング
	var front_left_wheel = car.get_node("FrontLeftWheel")
	var front_right_wheel = car.get_node("FrontRightWheel")
	var rear_left_wheel = car.get_node("RearLeftWheel")
	var rear_right_wheel = car.get_node("RearRightWheel")
	
	front_left_wheel.steering = current_steering
	front_right_wheel.steering = current_steering
	
	# 全輪にエンジンフォースを適用
	front_left_wheel.engine_force = current_engine_force
	front_right_wheel.engine_force = current_engine_force
	rear_left_wheel.engine_force = current_engine_force
	rear_right_wheel.engine_force = current_engine_force
	
	# 全輪にブレーキフォースを適用
	front_left_wheel.brake = current_brake_force
	front_right_wheel.brake = current_brake_force
	rear_left_wheel.brake = current_brake_force
	rear_right_wheel.brake = current_brake_force

func update_camera():
	# カメラを車両の後ろに追従させる
	var target_position = car.global_position + Vector3(0, 5, 10)
	camera.global_position = camera.global_position.lerp(target_position, 0.1)
	camera.look_at(car.global_position)

func update_stats(delta):
	# 速度の計算
	speed = car.linear_velocity.length()
	
	# 移動距離の計算
	distance_traveled += speed * delta
	
	# デバッグ情報の表示
	if Engine.get_process_frames() % 60 == 0:  # 1秒に1回更新
		print("速度: %.1f km/h, 距離: %.1f m" % [speed * 3.6, distance_traveled])

func reset_car():
	# 車両を初期位置にリセット
	car.global_position = start_position
	car.linear_velocity = Vector3.ZERO
	car.angular_velocity = Vector3.ZERO
	distance_traveled = 0.0
	print("車両をリセットしました")

func _input(event):
	if event.is_action_pressed("ui_cancel"):  # ESCキー
		reset_car() 